const { Chart, ChartResult, ChartUpload, Department } = require('../models');
const { UPLOAD_STATUS } = require('../models/chartUpload.model');
const { CHART_UPLOAD } = require('../config/chartUploads');
const counterService = require('./counter.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// ---------- Admin Upload page: uploaded charts, draft → published ----------

const DUPLICATE_KEY = 11000;

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

module.exports = { listUploads, createUpload, setStatus, deleteUpload };
