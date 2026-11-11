const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { DEPARTMENT_FILTER_KEYS } = require('../config/adminDepartments');
const { CHART_STATUS_KEYS, CHART_SORT_FIELDS, CHART_LIMITS: C, CHART_DEPARTMENT_LIMITS: D } = require('../config/adminCharts');
const { CHART_ID_PATTERN } = require('../config/certificates');

const page = Joi.number().integer().min(1).default(1);

const getDepartments = {
  query: Joi.object({
    group: Joi.string().valid(...DEPARTMENT_FILTER_KEYS).default('all'),
    search: Joi.string().trim().max(D.search).allow(''),
    page,
    limit: Joi.number().integer().min(1).max(D.maxLimit).default(D.defaultLimit),
  }),
};

const getCharts = {
  query: Joi.object({
    dept: Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN).messages({ 'string.pattern.base': 'dept must be a department key such as CARDIO' }),
    status: Joi.string().valid(...CHART_STATUS_KEYS).default('all'),
    search: Joi.string().trim().max(C.search).allow(''),
    sortBy: Joi.string().valid(...CHART_SORT_FIELDS).default('position'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
    page,
    limit: Joi.number().integer().min(1).max(C.maxLimit).default(C.defaultLimit),
  }),
};

const getChart = {
  params: Joi.object({
    chartId: Joi.string().trim().uppercase().pattern(CHART_ID_PATTERN).required().messages({ 'string.pattern.base': 'chartId must be a chart ID such as CARDIO-0001' }),
  }),
};

module.exports = { getDepartments, getCharts, getChart };
