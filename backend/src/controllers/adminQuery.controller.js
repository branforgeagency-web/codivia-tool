const { adminQueryService: s, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getQueries = async (req, res) => {
  res.status(httpStatus.OK).json(await s.queryQueries(req.query));
};

const getPendingCount = async (req, res) => {
  res.status(httpStatus.OK).json(await s.countPending());
};

const answerQuery = async (req, res) => {
  const out = await s.answerQuery(req.params.workId, req.params.queryId, req.body.answer, req.user);
  await audit.record(req.user, 'query.answer', {
    target: { type: 'work', id: req.params.workId },
    summary: req.body.answer,
    details: { queryId: req.params.queryId },
  });
  res.status(httpStatus.OK).json(out);
};

module.exports = { getQueries, getPendingCount, answerQuery };
