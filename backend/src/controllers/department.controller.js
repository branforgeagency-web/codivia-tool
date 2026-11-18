const { departmentService, auditService: audit } = require('../services');

const deptTarget = (key, name) => ({ type: 'department', id: key, label: name ? `${name} (${key})` : key });
const httpStatus = require('../utils/httpStatus');

const getMeta = async (req, res) => {
  res.status(httpStatus.OK).json(departmentService.getMeta());
};

const getDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.queryDepartments(req.query, req.user));
};

const getDepartment = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.getDepartment(req.params.key, req.user));
};

const createDepartment = async (req, res) => {
  const out = await departmentService.createDepartment(req.body, req.user);
  await audit.record(req.user, 'department.create', { target: deptTarget(req.body.key, req.body.name) });
  res.status(httpStatus.CREATED).json(out);
};

const updateDepartment = async (req, res) => {
  const out = await departmentService.updateDepartment(req.params.key, req.body, req.user);
  const fields = Object.keys(req.body);
  const active = req.body.isActive === undefined ? '' : req.body.isActive ? 'set active' : 'set inactive';
  await audit.record(req.user, 'department.update', {
    target: deptTarget(req.params.key, (out && out.name) || req.body.name),
    summary: [active, `Changed ${fields.filter((f) => f !== 'isActive').join(', ')}`].filter((x) => x && x !== 'Changed ').join('; '),
    details: { fields },
  });
  res.status(httpStatus.OK).json(out);
};

const deleteDepartment = async (req, res) => {
  const label = await audit.labelOf('department', req.params.key);
  await departmentService.deleteDepartment(req.params.key);
  await audit.record(req.user, 'department.delete', { target: { type: 'department', id: req.params.key, label }, summary: 'Deleted with its allocations' });
  res.status(httpStatus.NO_CONTENT).send();
};

const getPublicDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.getPublicDepartments());
};

module.exports = {
  getPublicDepartments, getMeta, getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
