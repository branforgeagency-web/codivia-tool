const { adminWorkService: s } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getWork = async (req, res) => {
  res.status(httpStatus.OK).json(await s.queryWork(req.query));
};

const getSummary = async (req, res) => {
  res.status(httpStatus.OK).json(await s.summary());
};

const returnToStudent = async (req, res) => {
  res.status(httpStatus.OK).json(await s.returnToStudent(req.params.workId, req.body, req.user));
};

const addNote = async (req, res) => {
  res.status(httpStatus.CREATED).json(await s.addNote(req.params.workId, req.body, req.user));
};

module.exports = { getWork, getSummary, returnToStudent, addNote };
