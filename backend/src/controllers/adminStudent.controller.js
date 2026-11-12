const { adminStudentService: s } = require('../services');
const httpStatus = require('../utils/httpStatus');

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
  res.status(httpStatus.OK).json(await s.setStudentAllocations(req.params.userId, req.body.depts));
};

const previewBulk = async (req, res) => {
  res.status(httpStatus.OK).json(await s.previewBulkAllocation());
};

const applyBulk = async (req, res) => {
  res.status(httpStatus.OK).json(await s.applyBulkAllocation());
};

module.exports = { getStudents, getStudent, getAllocations, setAllocations, previewBulk, applyBulk };
