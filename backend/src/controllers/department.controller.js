const { departmentService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMeta = async (req, res) => {
  res.status(httpStatus.OK).json(departmentService.getMeta());
};

const getPools = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.queryPools(req.query));
};

const getDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.queryDepartments(req.query, req.user));
};

const getDepartment = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.getDepartment(req.params.key, req.user));
};

const createDepartment = async (req, res) => {
  res.status(httpStatus.CREATED).json(await departmentService.createDepartment(req.body, req.user));
};

const updateDepartment = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentService.updateDepartment(req.params.key, req.body, req.user));
};

const deleteDepartment = async (req, res) => {
  await departmentService.deleteDepartment(req.params.key);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { getMeta, getPools, getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
