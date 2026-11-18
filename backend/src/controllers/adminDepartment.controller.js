const { adminDepartmentService, allocationService, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await adminDepartmentService.queryDepartments(req.query));
};

const getAllocations = async (req, res) => {
  res.status(httpStatus.OK).json(await allocationService.queryAllocations(req.params.deptKey, req.query));
};

const saveAllocations = async (req, res) => {
  const out = await allocationService.saveAllocations(req.params.deptKey, req.body.allocations);
  await audit.record(req.user, 'allocation.department', {
    target: { type: 'department', id: req.params.deptKey, label: out.department && out.department.name ? `${out.department.name} (${req.params.deptKey})` : '' },
    summary: `${out.saved} set, ${out.removed} removed`,
    details: { allocations: req.body.allocations },
  });
  res.status(httpStatus.OK).json(out);
};

const setAllocation = async (req, res) => {
  const out = await allocationService.setAllocation(req.params.deptKey, req.params.userId, req.body);
  await audit.record(req.user, 'allocation.set', {
    target: { type: 'student', id: req.params.userId, label: `${out.student.name} (${out.student.id})` },
    summary: `${req.params.deptKey} charts ${req.body.start}–${req.body.end}`,
    details: { dept: req.params.deptKey, start: req.body.start, end: req.body.end },
  });
  res.status(httpStatus.OK).json(out);
};

const removeAllocation = async (req, res) => {
  await allocationService.removeAllocation(req.params.deptKey, req.params.userId);
  await audit.record(req.user, 'allocation.remove', {
    target: { type: 'student', id: req.params.userId },
    summary: `Removed ${req.params.deptKey} allocation`,
    details: { dept: req.params.deptKey },
  });
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { getDepartments, getAllocations, saveAllocations, setAllocation, removeAllocation };
