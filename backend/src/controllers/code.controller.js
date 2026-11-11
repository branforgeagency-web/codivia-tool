const { codeService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMeta = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.getMeta());
};

const searchCodes = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.searchCodes(req.query));
};

const getCode = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.getCode(req.params.system, req.params.code));
};

const getFamily = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.getFamily(req.params.stem));
};

const validateCodes = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.validateCodes(req.body.codes));
};

const getNotes = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.getNotes(req.params.code));
};

const searchIndex = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.searchIndex(req.params.index, req.query.q));
};

const resolveIndexRef = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.resolveIndexRef(req.params.index, req.query.ref));
};

const searchTable = async (req, res) => {
  res.status(httpStatus.OK).json(await codeService.searchTable(req.params.table, req.query.q));
};

module.exports = {
  getMeta,
  searchCodes,
  getCode,
  getFamily,
  validateCodes,
  getNotes,
  searchIndex,
  resolveIndexRef,
  searchTable,
};
