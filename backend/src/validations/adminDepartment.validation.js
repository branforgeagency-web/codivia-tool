const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const {
  DEPARTMENT_FILTER_KEYS,
  ADMIN_DEPARTMENT_SORT_FIELDS,
  ADMIN_DEPARTMENT_LIMITS: D,
  ALLOCATION_FILTERS,
  ALLOCATION_LIMITS: A,
} = require('../config/adminDepartments');
const { objectId } = require('./custom.validation');

const deptKey = Joi.string()
  .trim()
  .uppercase()
  .pattern(DEPARTMENT_KEY_PATTERN)
  .required()
  .messages({ 'string.pattern.base': 'deptKey must be a department key such as CARDIO' });
const userId = Joi.string().custom(objectId).required();
const page = Joi.number().integer().min(1).default(1);
const chart = Joi.number().integer().min(1);

// ---- departments list ----
const getDepartments = {
  query: Joi.object({
    group: Joi.string().valid(...DEPARTMENT_FILTER_KEYS).default('all'),
    search: Joi.string().trim().max(D.search).allow(''),
    sortBy: Joi.string().valid(...ADMIN_DEPARTMENT_SORT_FIELDS).default('order'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
    page,
    limit: Joi.number().integer().min(1).max(D.maxLimit).default(D.defaultLimit),
  }),
};

// ---- manage allocation ----
const range = {
  start: chart.required(),
  end: chart.min(Joi.ref('start')).required().messages({ 'number.min': 'end must be the same as or after start' }),
};

const getAllocations = {
  params: Joi.object({ deptKey }),
  query: Joi.object({
    search: Joi.string().trim().max(A.search).allow(''),
    assigned: Joi.string().valid(...ALLOCATION_FILTERS).default('all'),
    page,
    limit: Joi.number().integer().min(1).max(A.maxLimit).default(A.defaultLimit),
  }),
};

const setAllocation = { params: Joi.object({ deptKey, userId }), body: Joi.object(range) };
const removeAllocation = { params: Joi.object({ deptKey, userId }) };

// Each row: { userId, start, end } sets a range; { userId, start: null, end: null } removes it.
const saveAllocations = {
  params: Joi.object({ deptKey }),
  body: Joi.object({
    allocations: Joi.array()
      .items(
        Joi.alternatives().try(
          Joi.object({ userId, ...range }),
          Joi.object({ userId, start: Joi.valid(null).required(), end: Joi.valid(null).required() })
        )
      )
      .unique('userId')
      .max(A.bulkMax)
      .required()
      .messages({ 'array.unique': 'Each student can only appear once' }),
  }),
};

module.exports = { getDepartments, getAllocations, setAllocation, removeAllocation, saveAllocations };
