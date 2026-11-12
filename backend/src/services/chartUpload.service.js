const path = require('path');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { Chart, ChartResult, ChartUpload, Department } = require('../models');
const { UPLOAD_STATUS } = require('../models/chartUpload.model');
const { CHART_UPLOAD, UPLOAD_LIMITS } = require('../config/chartUploads');
const counterService = require('./counter.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// ---------- Admin Upload page: uploaded charts, draft → published ----------

const DUPLICATE_KEY = 11000;
const DOC_MAGIC = Buffer.from('d0cf11e0a1b11ae1', 'hex');
const PDF_STANDARD_FONTS = `${path.resolve(
  path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')),
  '../../standard_fonts'
)}${path.sep}`;
let pdfJs;

const notFound = () => new ApiError(httpStatus.NOT_FOUND, 'Uploaded chart not found');

// As the Upload page lists it.
const toView = (u, deptName) => ({
  id: String(u._id),
  dept: u.dept,
  deptName: deptName || u.dept,
  title: u.title,
  record: u.record,
  answerKey: u.answerKey,
  difficulty: u.difficulty,
  patient: u.patient,
  sourceName: u.sourceName,
  status: u.status,
  chart: u.chart,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

const findDepartment = async (key) => {
  const dept = await Department.findById(key).select('name').lean();
  if (!dept) throw new ApiError(httpStatus.BAD_REQUEST, `Department ${key} not found`, [{ field: 'dept', message: `Department ${key} not found` }]);
  return dept;
};

const isMagic = (buffer, signature) => buffer.subarray(0, signature.length).equals(signature);

const extractPdfText = async (buffer) => {
  pdfJs ||= import('pdfjs-dist/legacy/build/pdf.mjs');
  const { getDocument } = await pdfJs;
  const task = getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: PDF_STANDARD_FONTS,
  });
  const pdf = await task.promise;
  try {
    if (pdf.numPages > UPLOAD_LIMITS.pdfPages) {
      throw new ApiError(httpStatus.PAYLOAD_TOO_LARGE, `PDFs may contain at most ${UPLOAD_LIMITS.pdfPages} pages.`);
    }
    const pages = [];
    let length = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => (typeof item.str === 'string' ? item.str : '')).join(' ');
      pages.push(text);
      length += text.length;
      if (length > UPLOAD_LIMITS.record) {
        throw new ApiError(httpStatus.PAYLOAD_TOO_LARGE, 'Extracted text exceeds the 200,000 character limit.');
      }
    }
    return pages.join('\n\n');
  } finally {
    await pdf.destroy();
  }
};

const extractFileText = async (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const buffer = file.buffer;
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'The uploaded file is empty or invalid.');
  }

  let text;
  try {
    if (extension === '.pdf') {
      if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'The file does not appear to be a valid PDF.');
      }
      text = await extractPdfText(buffer);
    } else if (extension === '.docx') {
      if (!isMagic(buffer, Buffer.from('504b0304', 'hex'))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'The file does not appear to be a valid DOCX document.');
      }
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === '.doc') {
      if (!isMagic(buffer, DOC_MAGIC)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'The file does not appear to be a valid DOC document.');
      }
      text = (await new WordExtractor().extract(buffer)).getBody();
    } else if (extension === '.txt') {
      if (buffer.includes(0)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'The TXT file must contain UTF-8 text.');
      }
      text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported file type. Use PDF, DOC/DOCX or TXT.');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.BAD_REQUEST, 'Could not extract text. Check that the document is valid and not password-protected.');
  }

  const normalized = String(text || '').replace(/\s+\n/g, '\n').trim();
  if (!normalized) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No text could be extracted. Scanned PDFs require OCR or manual text entry.');
  }
  if (normalized.length > UPLOAD_LIMITS.record) {
    throw new ApiError(httpStatus.PAYLOAD_TOO_LARGE, 'Extracted text exceeds the 200,000 character limit.');
  }
  return { fileName: path.basename(file.originalname), text: normalized };
};

// Publishing needs a complete answer key: every row with a code, type, description and rationale.
const checkPublishable = (upload) => {
  const key = upload.answerKey || [];
  if (!key.length) throw new ApiError(httpStatus.BAD_REQUEST, 'Add at least one code before publishing');
  const incomplete = key.filter((r) => !r.code || !r.type || !r.desc?.trim() || !r.why?.trim());
  if (incomplete.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${incomplete.length} answer key row(s) need a code, type, description and rationale before publishing`);
  }
};

// Adds the upload to the department's chart pool, after the last chart (allocations are by position).
const publish = async (upload, deptName) => {
  checkPublishable(upload);
  const id = `${upload.dept}-${CHART_UPLOAD.idBase + (await counterService.nextSequence(CHART_UPLOAD.counter))}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const last = await Chart.findOne({ dept: upload.dept }).sort({ position: -1 }).select('position').lean();
    try {
      await Chart.create({
        _id: id,
        dept: upload.dept,
        deptName,
        position: (last?.position || 0) + 1,
        difficulty: upload.difficulty,
        title: upload.title,
        patient: upload.patient,
        record: upload.record,
        answerKey: upload.answerKey.map(({ code, type, desc, why }) => ({ code, type, desc, why })),
        source: 'upload',
      });
      upload.chart = id;
      upload.status = UPLOAD_STATUS.PUBLISHED;
      return;
    } catch (err) {
      // Another chart took that position at the same moment: try the next one.
      if (err.code !== DUPLICATE_KEY || attempt === 2) throw err;
    }
  }
};

// Takes the chart back out of the pool. Refused once a student has submitted it, so no score is lost.
// Later charts in the department move up one place, so positions stay 1..pool with no gap.
const unpublish = async (upload) => {
  if (upload.chart) {
    if (await ChartResult.exists({ chart: upload.chart })) {
      throw new ApiError(httpStatus.CONFLICT, 'Students have already submitted this chart, so it must stay published');
    }
    const chart = await Chart.findByIdAndDelete(upload.chart).select('dept position').lean();
    if (chart) {
      const later = await Chart.find({ dept: chart.dept, position: { $gt: chart.position } }).sort({ position: 1 }).select('_id position').lean();
      for (const c of later) await Chart.updateOne({ _id: c._id }, { $set: { position: c.position - 1 } });
    }
  }
  upload.chart = null;
  upload.status = UPLOAD_STATUS.DRAFT;
};

// Newest first, paged; `filters` counts cover every upload.
const listUploads = async ({ status = 'all', page = 1, limit = 10 } = {}) => {
  const match = status === 'all' ? {} : { status };
  const [uploads, totalResults, counts, departments] = await Promise.all([
    ChartUpload.find(match).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ChartUpload.countDocuments(match),
    ChartUpload.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Department.find().select('name').lean(),
  ]);
  const names = new Map(departments.map((d) => [d._id, d.name]));
  const countOf = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  return {
    results: uploads.map((u) => toView(u, names.get(u.dept))),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
    filters: [
      { key: 'all', label: 'All', count: (countOf.draft || 0) + (countOf.published || 0) },
      { key: UPLOAD_STATUS.DRAFT, label: 'Drafts', count: countOf.draft || 0 },
      { key: UPLOAD_STATUS.PUBLISHED, label: 'Published', count: countOf.published || 0 },
    ],
  };
};

const createUpload = async ({ status = UPLOAD_STATUS.DRAFT, ...body }, actor) => {
  const dept = await findDepartment(body.dept);
  const upload = new ChartUpload({ ...body, createdBy: actor._id });
  if (status === UPLOAD_STATUS.PUBLISHED) await publish(upload, dept.name);
  await upload.save();
  return toView(upload.toObject(), dept.name);
};

const findUpload = async (id) => {
  const upload = await ChartUpload.findById(id);
  if (!upload) throw notFound();
  return upload;
};

// Publish (into the chart pool) or move back to draft.
const setStatus = async (id, status) => {
  const upload = await findUpload(id);
  const dept = await findDepartment(upload.dept);
  if (status !== upload.status) {
    if (status === UPLOAD_STATUS.PUBLISHED) await publish(upload, dept.name);
    else await unpublish(upload);
    await upload.save();
  }
  return toView(upload.toObject(), dept.name);
};

const deleteUpload = async (id) => {
  const upload = await findUpload(id);
  await unpublish(upload); // refused if students have submitted it
  await upload.deleteOne();
};

module.exports = { extractFileText, listUploads, createUpload, setStatus, deleteUpload };
