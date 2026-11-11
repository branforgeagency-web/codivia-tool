const { adminDepartmentService, allocationService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await adminDepartmentService.queryDepartments(req.query));
};

const getAllocations = async (req, res) => {
  res.status(httpStatus.OK).json(await allocationService.queryAllocations(req.params.deptKey, req.query));
};

const saveAllocations = async (req, res) => {
  res.status(httpStatus.OK).json(await allocationService.saveAllocations(req.params.deptKey, req.body.allocations));
};

const setAllocation = async (req, res) => {
  res.status(httpStatus.OK).json(await allocationService.setAllocation(req.params.deptKey, req.params.userId, req.body));
};

const removeAllocation = async (req, res) => {
  await allocationService.removeAllocation(req.params.deptKey, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { getDepartments, getAllocations, saveAllocations, setAllocation, removeAllocation };
