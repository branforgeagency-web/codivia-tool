const { chartUploadService, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');
const ApiError = require('../utils/ApiError');
const { keyDiff } = require('../utils/auditDiff');

// "EM-0042 — Chest pain (Emergency Medicine)"; a draft has no chart ID yet.
const uploadTarget = (u) => ({ type: 'upload', id: u.id, label: `${[u.chart, u.title].filter(Boolean).join(' — ')} (${u.deptName})` });

const extractText = async (req, res) => {
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a PDF, DOC/DOCX or TXT file.');
  const result = await chartUploadService.extractFileText(req.file);
  res.status(httpStatus.OK).json(result);
};

const getUploads = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.listUploads(req.query));
};

const createUpload = async (req, res) => {
  const out = await chartUploadService.createUpload(req.body, req.user);
  await audit.record(req.user, 'upload.create', {
    target: uploadTarget(out),
    summary: out.status === 'published' ? `Uploaded and published as ${out.chart}` : 'Saved as draft',
    details: { status: out.status, chart: out.chart || null, codes: (out.answerKey || []).map((a) => a.code) },
  });
  res.status(httpStatus.CREATED).json(out);
};

const getUpload = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.getUpload(req.params.uploadId));
};

const updateUpload = async (req, res) => {
  const before = await chartUploadService.getUpload(req.params.uploadId);
  const out = await chartUploadService.updateUpload(req.params.uploadId, req.body);
  const fields = Object.keys(req.body);
  const diff = req.body.answerKey ? keyDiff(before.answerKey, out.answerKey) : null;
  const moved = before.dept !== out.dept ? `moved ${before.dept} → ${out.dept}` : '';
  await audit.record(req.user, 'upload.update', {
    target: uploadTarget(out),
    summary: [diff && diff.text ? 'Answer key: ' + diff.text : `Changed ${fields.join(', ')}`, moved].filter(Boolean).join('; '),
    details: { fields, status: out.status, ...(diff ? { added: diff.added, removed: diff.removed } : {}) },
  });
  res.status(httpStatus.OK).json(out);
};

const setStatus = async (req, res) => {
  const before = await chartUploadService.getUpload(req.params.uploadId);
  const out = await chartUploadService.setStatus(req.params.uploadId, req.body.status);
  if (before.status !== out.status) {
    const published = out.status === 'published';
    await audit.record(req.user, published ? 'upload.publish' : 'upload.unpublish', {
      target: uploadTarget(published ? out : before),
      summary: published ? `Added to the ${out.deptName} chart pool as ${out.chart}` : `Taken out of the chart pool (was ${before.chart})`,
    });
  }
  res.status(httpStatus.OK).json(out);
};

const deleteUpload = async (req, res) => {
  const before = await chartUploadService.getUpload(req.params.uploadId);
  await chartUploadService.deleteUpload(req.params.uploadId);
  await audit.record(req.user, 'upload.delete', { target: uploadTarget(before), summary: `Deleted ${before.status} upload` });
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { extractText, getUploads, createUpload, getUpload, updateUpload, setStatus, deleteUpload };
