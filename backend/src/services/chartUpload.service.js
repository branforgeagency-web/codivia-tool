const path = require('path');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { Chart, ChartResult, ChartUpload, ChartWork, Department } = require('../models');
const { UPLOAD_STATUS } = require('../models/chartUpload.model');
const { CHART_UPLOAD, UPLOAD_LIMITS } = require('../config/chartUploads');
const { WORK_LIMITS, WORK_TYPES } = require('../config/workQueue');
const { BILLING_TYPE_LABELS, DX_CLASSES, ENCOUNTER_TYPES, ENCOUNTER_TYPE_LIST, encounterProfile } = require('../config/encounter');
const counterService = require('./counter.service');
const { publicUrl, deleteFile } = require('./media.service');
const ApiError = require('../utils/ApiError');
const { readChartText } = require('../utils/readChartText');
const httpStatus = require('../utils/httpStatus');
const { withMediaUrls } = require('../utils/chartMedia');

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
  encounterType: u.encounterType || null,
  billingType: u.billingType || null,
  workType: u.workType || WORK_TYPES.CODE,
  documents: u.documents || [],
  encounter: u.encounter || null,
  original: u.original || null,
  denial: u.denial || null,
  previousRecords: u.previousRecords || [],
  episodes: u.episodes || [],
  clinical: withMediaUrls(u.clinical) || null,
  keyMeta: u.keyMeta || null,
  cdiResponse: u.cdiResponse || '',
  sourceName: u.sourceName,
  sourceFile: u.sourceFile && u.sourceFile.key ? { ...u.sourceFile, url: publicUrl(u.sourceFile.key) } : null,
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
      // Keep the PDF's line breaks (end-of-line marks and a change of baseline), so "Label: value"
      // lines and answer key rows stay one per line for readChartText.
      let text = '';
      let lastY = null;
      content.items.forEach((item) => {
        const y = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !text.endsWith('\n')) text += '\n';
        else if (text && !text.endsWith('\n') && !text.endsWith(' ') && item.str && !item.str.startsWith(' ')) text += ' ';
        text += typeof item.str === 'string' ? item.str : '';
        if (item.hasEOL) text += '\n';
        lastY = y;
      });
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

// Extract the file, then read its labels into the form fields (config/chartImport.js), so the
// admin does not retype what the chart already says. text = the record students read.
const importChartFile = async (file) => {
  const { fileName, text } = await extractFileText(file);
  const departments = await Department.find().select('name').lean();
  const { record, fields, found } = readChartText(text, { departments: departments.map((d) => ({ id: d._id, name: d.name })) });
  if (!record.trim()) throw new ApiError(httpStatus.BAD_REQUEST, 'The file has no chart text outside its setup / answer key blocks.');
  return { fileName, text: record, fields, found };
};

// Publishing needs a complete answer key: every row with a code, type, description and rationale.
const checkPublishable = (upload) => {
  const bad = (msg, field) => {
    throw new ApiError(httpStatus.BAD_REQUEST, msg, field ? [{ field, message: msg }] : undefined);
  };
  // Encounter type: OP or IP; an inpatient chart also says how it is billed (procedure code set).
  if (!ENCOUNTER_TYPE_LIST.includes(upload.encounterType)) bad('Choose the encounter type (OP – Outpatient or IP – Inpatient)', 'encounterType');
  if (upload.encounterType === ENCOUNTER_TYPES.IP && !upload.billingType) bad('Choose the billing type of this inpatient chart (hospital facility or professional)', 'billingType');
  const key = upload.answerKey || [];
  if (!key.length) bad('Add at least one code before publishing');
  const incomplete = key.filter((r) => !r.code || !r.type || !r.desc?.trim() || !r.why?.trim());
  if (incomplete.length) bad(`${incomplete.length} answer key row(s) need a code, type, description and rationale before publishing`);
  // Same rules as the Upload form, so publishing a draft from the list can't skip them.
  const term = upload.encounterType === ENCOUNTER_TYPES.IP ? 'principal diagnosis' : 'primary (first-listed) diagnosis';
  const pdx = key.filter((r) => r.type === 'PDx');
  if (!pdx.length) bad(`One code must be marked PDx (${term}) before publishing`);
  if (pdx.length > 1) bad(`Only one code can be marked PDx (${term}); mark the others SDx`);
  if (pdx[0].uncertain && upload.encounterType !== ENCOUNTER_TYPES.IP) {
    bad('The primary diagnosis of an outpatient chart cannot be an uncertain diagnosis: outpatient coding reports the signs and symptoms instead');
  }
  // What each work type needs so the student workspace can show it.
  const type = upload.workType || WORK_TYPES.CODE;
  const o = upload.original || {};
  if (type === WORK_TYPES.REVIEW && !(o.dx || []).length && !(o.lines || []).length) bad('A charge review needs the provider’s original diagnoses or charge lines');
  if (type === WORK_TYPES.DRG && !(o.dx || []).length) bad('A DRG validation needs the pre-coded diagnoses');
  if (type === WORK_TYPES.DENIAL) {
    if (!(o.lines || []).length) bad('A denial needs the charge lines as billed (with remit codes)');
    if (!(o.lines || []).some((l) => l.remit)) bad('A denial needs at least one remit (reason) code on the billed lines');
    if (!upload.denial || !upload.denial.invoice || !upload.denial.invoice.num) bad('A denial needs the invoice / claim number');
    if (!upload.keyMeta || !upload.keyMeta.decision) bad('A denial needs the correct decision (correct, appeal or write off)');
  }
};

// The answer key as Chart stores it: only the optional checks that were filled in.
const toChartKey = (rows) =>
  rows.map(({ code, type, desc, why, poa, mods, units, ptrs, uncertain }) => {
    const row = { code, type, desc, why };
    if (uncertain && ['PDx', 'SDx', 'Dx'].includes(type)) row.uncertain = true;
    if (poa) row.poa = poa;
    if (Array.isArray(mods)) row.mods = mods; // [] = the line must carry no modifier
    if (units) row.units = units;
    if (ptrs && ptrs.length) row.ptrs = ptrs;
    return row;
  });

// The fields a Chart gets from an upload (or from the Edit form): everything except its ID,
// department, position and source. Optional work-queue fields left out are cleared.
const chartFields = (u) => {
  const type = u.workType || WORK_TYPES.CODE;
  const encounterType = ENCOUNTER_TYPE_LIST.includes(u.encounterType) ? u.encounterType : undefined;
  return {
    encounterType,
    billingType: encounterType === ENCOUNTER_TYPES.IP ? u.billingType || undefined : undefined,
    difficulty: u.difficulty,
    title: u.title,
    patient: u.patient,
    record: u.record,
    answerKey: toChartKey(u.answerKey || []),
    workType: type,
    documents: u.documents && u.documents.length ? u.documents : undefined,
    encounter: u.encounter || undefined,
    original: type !== WORK_TYPES.CODE ? u.original || undefined : undefined,
    denial: type === WORK_TYPES.DENIAL ? u.denial || undefined : undefined,
    previousRecords: u.previousRecords && u.previousRecords.length ? u.previousRecords : undefined,
    episodes: u.episodes && u.episodes.length ? u.episodes : undefined,
    clinical: u.clinical && Object.keys(u.clinical).length ? u.clinical : undefined,
    keyMeta: u.keyMeta || undefined,
    cdiResponse: u.cdiResponse || undefined,
  };
};

// Edit form -> upload record. The form always sends the whole chart, so optional work-queue fields
// that are missing were cleared by the admin. Patient fields are merged (blank = keep).
const REQUIRED_EDITS = ['title', 'record', 'answerKey', 'difficulty', 'workType', 'encounterType'];
const OPTIONAL_EDITS = ['documents', 'encounter', 'original', 'denial', 'keyMeta', 'cdiResponse', 'billingType'];
const KEPT_WHEN_ABSENT = ['previousRecords', 'episodes', 'clinical']; // the edit form may not send these yet
const applyUploadEdits = (upload, body) => {
  REQUIRED_EDITS.forEach((k) => body[k] !== undefined && upload.set(k, body[k]));
  OPTIONAL_EDITS.forEach((k) => upload.set(k, body[k] === undefined || body[k] === '' ? undefined : body[k]));
  const filled = (v) => !!v && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);
  KEPT_WHEN_ABSENT.forEach((k) => body[k] !== undefined && upload.set(k, filled(body[k]) ? body[k] : undefined));
  if (body.patient) upload.set('patient', { ...(upload.toObject().patient || {}), ...body.patient });
};

// ---- changing the encounter / billing type of a live chart ----
// Students' work on a chart was coded (and scored) for its encounter type. Changing it on a chart that
// has submissions or saved drafts needs the admin to confirm (confirmEncounterChange); without it the
// change is refused with 409 and the numbers involved. Scores already saved stay as they were graded.
const ENCOUNTER_REVIEW_RULE = 'encounter.change.review';
const describeProfile = (p) => p.encounterType + (p.billingType ? ` (${BILLING_TYPE_LABELS[p.billingType].toLowerCase()})` : '');

const encounterChange = async (dept, before, next) => {
  const department = await Department.findById(dept).select('elements').lean();
  const elements = (department && department.elements) || [];
  const from = encounterProfile(before, elements);
  const to = encounterProfile(next, elements);
  if (from.encounterType === to.encounterType && from.billingType === to.billingType) return null;
  return { from, to, label: `${describeProfile(from)} → ${describeProfile(to)}` };
};

const assertEncounterChange = async (chartId, change, confirmed) => {
  if (!change) return null;
  const [submitted, inProgress] = await Promise.all([
    ChartResult.countDocuments({ chart: chartId }),
    ChartWork.countDocuments({ chart: chartId, draft: { $ne: null } }),
  ]);
  const impact = { submitted, inProgress };
  if ((submitted || inProgress) && !confirmed) {
    const parts = [submitted ? `${submitted} submitted score(s)` : '', inProgress ? `${inProgress} student draft(s)` : ''].filter(Boolean).join(' and ');
    throw new ApiError(httpStatus.CONFLICT, `Changing the encounter type (${change.label}) affects ${parts} on this chart. Review the impact and confirm the change.`, [
      { field: 'encounterType', rule: ENCOUNTER_REVIEW_RULE, message: 'Confirmation required', from: describeProfile(change.from), to: describeProfile(change.to), ...impact },
    ]);
  }
  return impact;
};

// After a confirmed change: the students' drafts use the new first-listed term (primary <-> principal)
// and their activity says why. Their codes and sequence are left for them to review.
const relabelDrafts = async (chartId, change, actor) => {
  const target = change.to.firstListed;
  const other = target === DX_CLASSES.PRINCIPAL ? DX_CLASSES.PRIMARY : DX_CLASSES.PRINCIPAL;
  const works = await ChartWork.find({ chart: chartId, draft: { $ne: null } }).select('draft').lean();
  const text = `Encounter type changed by an administrator: ${change.label}. Review your diagnosis classifications and procedure codes.`;
  for (const w of works) {
    const dx = ((w.draft && w.draft.dx) || []).map((d) => (d.cls === other ? { ...d, cls: target } : d));
    await ChartWork.updateOne(
      { _id: w._id },
      { $set: { 'draft.dx': dx }, $push: { activity: { $each: [{ at: new Date(), kind: 'admin', text, by: actor && actor._id }], $slice: -WORK_LIMITS.activity } } }
    );
  }
};

// Applies the chart fields to a live chart, guarding an encounter type change. Returns the change
// (for the audit log) or null.
const applyChartFields = async (chart, fields, { confirmed, actor } = {}) => {
  const change = await encounterChange(chart.dept, chart.toObject(), fields);
  const impact = await assertEncounterChange(chart._id, change, confirmed);
  chart.set(fields);
  await chart.save();
  if (change && impact && impact.inProgress) await relabelDrafts(chart._id, change, actor);
  return change ? { from: describeProfile(change.from), to: describeProfile(change.to), ...impact } : null;
};

// Adds the upload to the department's chart pool, after the last chart (allocations are by position).
const publish = async (upload, deptName) => {
  checkPublishable(upload);
  const u = typeof upload.toObject === 'function' ? upload.toObject() : upload; // plain copy for Chart
  const id = `${upload.dept}-${CHART_UPLOAD.idBase + (await counterService.nextSequence(CHART_UPLOAD.counter))}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const last = await Chart.findOne({ dept: upload.dept }).sort({ position: -1 }).select('position').lean();
    try {
      await Chart.create({
        _id: id,
        dept: upload.dept,
        deptName,
        position: (last?.position || 0) + 1,
        ...chartFields(u),
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

const getUpload = async (id) => {
  const upload = await findUpload(id);
  const dept = await Department.findById(upload.dept).select('name').lean();
  return toView(upload.toObject(), dept && dept.name);
};

// Edit an upload (Upload page -> Edit). A draft can move to another department. A published upload
// must pass the publish checks, and its chart in the pool is updated too (same ID and position, so
// allocations and earlier scores are untouched; later submissions are graded against the new key).
const updateUpload = async (id, { dept: newDept, sourceName, sourceFile, confirmEncounterChange, ...body }, actor) => {
  const upload = await findUpload(id);
  if (newDept && newDept !== upload.dept) {
    if (upload.status === UPLOAD_STATUS.PUBLISHED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Move the chart back to draft before changing its department', [
        { field: 'dept', message: 'Published charts keep their department' },
      ]);
    }
    await findDepartment(newDept);
    upload.dept = newDept;
  }
  if (sourceName !== undefined) upload.sourceName = sourceName || undefined;
  // A replaced file is removed from S3 after the save succeeds.
  const oldKey = upload.sourceFile && upload.sourceFile.key;
  const replacedKey = sourceFile !== undefined && oldKey && oldKey !== (sourceFile && sourceFile.key) ? oldKey : null;
  if (sourceFile !== undefined) upload.sourceFile = sourceFile || undefined;
  applyUploadEdits(upload, body);
  const dept = await findDepartment(upload.dept);
  let changed = null;
  if (upload.status === UPLOAD_STATUS.PUBLISHED && upload.chart) {
    checkPublishable(upload);
    const chart = await Chart.findById(upload.chart);
    if (chart) changed = await applyChartFields(chart, chartFields(upload.toObject()), { confirmed: confirmEncounterChange, actor });
  }
  await upload.save();
  if (replacedKey) await deleteFile(replacedKey);
  return { ...toView(upload.toObject(), dept.name), encounterChange: changed };
};

const deleteUpload = async (id) => {
  const upload = await findUpload(id);
  await unpublish(upload); // refused if students have submitted it
  await upload.deleteOne();
  if (upload.sourceFile && upload.sourceFile.key) await deleteFile(upload.sourceFile.key);
};

module.exports = { extractFileText, importChartFile, listUploads, createUpload, getUpload, updateUpload, setStatus, deleteUpload, chartFields, checkPublishable, applyUploadEdits, applyChartFields };
