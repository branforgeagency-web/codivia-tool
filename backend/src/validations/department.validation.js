const Joi = require('joi');
const {
  ALL_DEPARTMENT_GROUPS,
  CODE_ELEMENT_KEYS,
  DEPARTMENT_KEY_PATTERN,
  DEPARTMENT_LIMITS,
} = require('../config/departments');

const key = Joi.string()
  .trim()
  .uppercase()
  .pattern(DEPARTMENT_KEY_PATTERN)
  .messages({ 'string.pattern.base': 'key must be 2-20 capital letters, digits or _ and start with a letter (e.g. CARDIO)' });
const keyParam = Joi.object({ key: key.required() });

const name = Joi.string().trim().min(1).max(DEPARTMENT_LIMITS.name);
const icon = Joi.string().trim().max(DEPARTMENT_LIMITS.icon).allow('');
const group = Joi.string().valid(...ALL_DEPARTMENT_GROUPS);
const elements = Joi.array()
  .items(Joi.string().trim().uppercase().valid(...CODE_ELEMENT_KEYS))
  .min(1)
  .unique();
const order = Joi.number().integer().min(0);
const isActive = Joi.boolean();

const getDepartments = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow(''),
    group,
    isActive,
    hasCharts: Joi.boolean(),
  }),
};

const createDepartment = {
  body: Joi.object({
    key: key.required(),
    name: name.required(),
    icon,
    group: group.required(),
    elements: elements.required(),
    order,
    isActive,
  }),
};

const getDepartment = { params: keyParam };
const updateDepartment = { params: keyParam, body: Joi.object({ name, icon, group, elements, order, isActive }).min(1) };
const deleteDepartment = { params: keyParam };

module.exports = { getDepartments, createDepartment, getDepartment, updateDepartment, deleteDepartment };
