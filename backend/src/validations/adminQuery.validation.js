const Joi = require('joi');
const { ADMIN_QUERY_LIMITS: L, QUERY_STATUS } = require('../config/workQueue');
const { objectId } = require('./custom.validation');

const getQueries = {
  query: Joi.object({
    status: Joi.string().valid(...Object.values(QUERY_STATUS), 'all').default(QUERY_STATUS.PENDING),
    search: Joi.string().trim().max(L.search).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit),
  }),
};

// The admin's answer, written as the physician's response.
const answerQuery = {
  params: Joi.object({
    workId: Joi.string().custom(objectId).required(),
    queryId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object({
    answer: Joi.string().trim().min(2).max(L.answer).required(),
  }),
};

module.exports = { getQueries, answerQuery };
