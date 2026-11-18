const { adminStudentService: s, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');

const studentTarget = (student) => ({ type: 'student', id: student.uid, label: `${student.name} (${student.id})` });
// Which fields an edit touched; a new password is noted, never stored.
const changedFields = (body) => Object.keys(body).filter((k) => body[k] !== undefined);
const rangesText = (depts) =>
  Object.entries(depts)
    .map(([k, r]) => (r && r.start != null ? `${k} ${r.start}–${r.end}` : `${k} removed`))
    .join(', ');

const createStudent = async (req, res) => {
  const out = await s.createStudent(req.body, req.user);
  await audit.record(req.user, 'student.create', { target: studentTarget(out.student), summary: `Added ${out.student.email}` });
  res.status(httpStatus.CREATED).json(out);
};

const updateStudent = async (req, res) => {
  const out = await s.updateStudent(req.params.userId, req.body, req.user);
  const fields = changedFields(req.body);
  await audit.record(req.user, 'student.update', {
    target: studentTarget(out.student),
    summary: `Changed ${fields.join(', ') || 'nothing'}`,
    details: { fields, name: req.body.name, email: req.body.email },
  });
  res.status(httpStatus.OK).json(out);
};

const deleteStudent = async (req, res) => {
  const label = await audit.labelOf('student', req.params.userId);
  await s.deleteStudent(req.params.userId, req.user);
  await audit.record(req.user, 'student.delete', { target: { type: 'student', id: req.params.userId, label } });
  res.status(httpStatus.NO_CONTENT).send();
};

const setStatus = async (req, res) => {
  const out = await s.setStudentStatus(req.params.userId, req.body.status, req.user);
  await audit.record(req.user, req.body.status === 'disabled' ? 'student.disable' : 'student.enable', { target: studentTarget(out.student) });
  res.status(httpStatus.OK).json(out);
};

const getStudents = async (req, res) => {
  res.status(httpStatus.OK).json(await s.queryStudents(req.query));
};

const getStudent = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getStudent(req.params.userId));
};

const getAllocations = async (req, res) => {
  res.status(httpStatus.OK).json(await s.getStudentAllocations(req.params.userId));
};

const setAllocations = async (req, res) => {
  const out = await s.setStudentAllocations(req.params.userId, req.body.depts);
  await audit.record(req.user, 'allocation.student', {
    target: { type: 'student', id: req.params.userId },
    summary: rangesText(req.body.depts) || 'Removed all allocations',
    details: { depts: req.body.depts },
  });
  res.status(httpStatus.OK).json(out);
};

const previewBulk = async (req, res) => {
  res.status(httpStatus.OK).json(await s.previewBulkAllocation());
};

const applyBulk = async (req, res) => {
  const out = await s.applyBulkAllocation();
  await audit.record(req.user, 'allocation.bulk', {
    target: { type: 'students', label: `${out.allocated} student(s)` },
    summary: `${out.size} charts each in ${(out.depts || []).join(', ')} for ${out.allocated} student(s) with no allocation`,
    details: { students: out.allocated, depts: out.depts, size: out.size },
  });
  res.status(httpStatus.OK).json(out);
};

module.exports = { createStudent, updateStudent, deleteStudent, setStatus, getStudents, getStudent, getAllocations, setAllocations, previewBulk, applyBulk };
