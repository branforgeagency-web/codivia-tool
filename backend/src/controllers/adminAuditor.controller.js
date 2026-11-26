const { adminAuditorService: s, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');

const auditorTarget = (a) => ({ type: 'auditor', id: a.uid, label: `${a.name} (${a.email})` });
const changedFields = (body) => Object.keys(body).filter((k) => body[k] !== undefined);

const getAuditors = async (req, res) => {
  res.status(httpStatus.OK).json(await s.queryAuditors(req.query));
};

const createAuditor = async (req, res) => {
  const out = await s.createAuditor(req.body, req.user);
  await audit.record(req.user, 'auditor.create', { target: auditorTarget(out.auditor), summary: `Added ${out.auditor.email}` });
  res.status(httpStatus.CREATED).json(out);
};

const updateAuditor = async (req, res) => {
  const out = await s.updateAuditor(req.params.userId, req.body, req.user);
  const fields = changedFields(req.body);
  await audit.record(req.user, 'auditor.update', {
    target: auditorTarget(out.auditor),
    summary: `Changed ${fields.join(', ') || 'nothing'}`,
    details: { fields, name: req.body.name, email: req.body.email },
  });
  res.status(httpStatus.OK).json(out);
};

const setStatus = async (req, res) => {
  const out = await s.setAuditorStatus(req.params.userId, req.body.status, req.user);
  await audit.record(req.user, req.body.status === 'disabled' ? 'auditor.disable' : 'auditor.enable', { target: auditorTarget(out.auditor) });
  res.status(httpStatus.OK).json(out);
};

const deleteAuditor = async (req, res) => {
  const label = await audit.labelOf('auditor', req.params.userId);
  await s.deleteAuditor(req.params.userId, req.user);
  await audit.record(req.user, 'auditor.delete', { target: { type: 'auditor', id: req.params.userId, label } });
  res.status(httpStatus.NO_CONTENT).send();
};

const getAssignments = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getAssignments(req.params.userId, req.query));
};

const setAssignments = async (req, res) => {
  const out = await s.setAssignments(req.params.userId, req.body, req.user);
  await audit.record(req.user, 'auditor.assign', {
    target: auditorTarget(out.auditor),
    summary: `${out.students} student(s) in ${out.deptName}`,
    details: { dept: out.dept, students: req.body.students },
  });
  res.status(httpStatus.OK).json(out);
};

module.exports = { getAuditors, createAuditor, updateAuditor, setStatus, deleteAuditor, getAssignments, setAssignments };
