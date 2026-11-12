const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { CHART_ID_PATTERN } = require('../config/certificates');

const page = Joi.number().integer().min(1).default(1);
const limit = Joi.number().integer().min(1).max(100).default(10);
const search = Joi.string().trim().max(100).allow('');
const deptKey = Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN).required();

const getMyDepartments = {
  query: Joi.object({ search, status: Joi.string().valid('all', 'active', 'new', 'complete').default('all'), page, limit }),
};

const getMyQueue = {
  params: Joi.object({ deptKey }),
  query: Joi.object({ search, status: Joi.string().valid('all', 'pending', 'worked').default('all'), page, limit }),
};

const getMyChart = {
  params: Joi.object({ deptKey, chartId: Joi.string().trim().uppercase().pattern(CHART_ID_PATTERN).required() }),
};

module.exports = { getMyDepartments, getMyQueue, getMyChart };
