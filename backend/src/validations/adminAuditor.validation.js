const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { AUDITOR_STATUS_KEYS, AUDIT_LIMITS: L } = require('../config/auditors');
const { objectId, strongPassword } = require('./custom.validation');
const { USER_LIMITS } = require('../config/users');
const { ALL_USER_STATUSES } = require('../config/userStatus');

const userIdParam = Joi.object({ userId: Joi.string().custom(objectId).required() });
const dept = Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN);

const getAuditors = {
  query: Joi.object({
    search: Joi.string().trim().max(L.search).allow(''),
    status: Joi.string().valid(...AUDITOR_STATUS_KEYS).default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit),
  }),
};

// The admin sets the auditor's first password.
const createAuditor = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(USER_LIMITS.name).required(),
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email).required(),
    password: Joi.string().custom(strongPassword).required(),
  }),
};

// Any of name / email / new password.
const updateAuditor = {
  params: userIdParam,
  body: Joi.object({
    name: Joi.string().trim().min(1).max(USER_LIMITS.name),
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email),
    password: Joi.string().custom(strongPassword),
  }).min(1),
};

const deleteAuditor = { params: userIdParam };

const setStatus = {
  params: userIdParam,
  body: Joi.object({ status: Joi.string().valid(...ALL_USER_STATUSES).required() }),
};

const getAssignments = { params: userIdParam, query: Joi.object({ dept }) };

// { dept, students: [userId] }: this auditor's complete student list in that department ([] releases all).
const setAssignments = {
  params: userIdParam,
  body: Joi.object({
    dept: dept.required(),
    students: Joi.array().items(Joi.string().custom(objectId)).max(L.assignStudents).required(),
  }),
};

module.exports = { getAuditors, createAuditor, updateAuditor, deleteAuditor, setStatus, getAssignments, setAssignments };
