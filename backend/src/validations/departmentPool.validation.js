const Joi = require('joi');
const { DEPARTMENT_POOL_SORT_FIELDS, DEPARTMENT_POOL_LIMITS: L } = require('../config/departmentPools');

const getPools = {
  query: Joi.object({
    search: Joi.string().trim().max(L.search).allow(''),
    sortBy: Joi.string().valid(...DEPARTMENT_POOL_SORT_FIELDS).default('order'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit),
  }),
};

module.exports = { getPools };
