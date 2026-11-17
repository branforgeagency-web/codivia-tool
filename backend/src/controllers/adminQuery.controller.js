const { adminQueryService: s } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getQueries = async (req, res) => {
  res.status(httpStatus.OK).json(await s.queryQueries(req.query));
};

const getPendingCount = async (req, res) => {
  res.status(httpStatus.OK).json(await s.countPending());
};

const answerQuery = async (req, res) => {
  res.status(httpStatus.OK).json(await s.answerQuery(req.params.workId, req.params.queryId, req.body.answer, req.user));
};

module.exports = { getQueries, getPendingCount, answerQuery };
