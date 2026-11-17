const Joi = require('joi');
const { ADMIN_WORK_TAB_KEYS, ADMIN_WORK_LIMITS: L } = require('../config/workQueue');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { objectId } = require('./custom.validation');

const workIdParam = Joi.object({ workId: Joi.string().custom(objectId).required() });

const getWork = {
  query: Joi.object({
    status: Joi.string().valid(...ADMIN_WORK_TAB_KEYS).default('attention'),
    dept: Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN).allow(''),
    queue: Joi.string().trim().max(200).allow(''),
    search: Joi.string().trim().max(L.search).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit),
  }),
};

// Back to the student's To do list; the note is optional.
const returnToStudent = {
  params: workIdParam,
  body: Joi.object({ note: Joi.string().trim().max(L.note).allow('') }),
};

const addNote = {
  params: workIdParam,
  body: Joi.object({ text: Joi.string().trim().min(1).max(L.note).required() }),
};

module.exports = { getWork, returnToStudent, addNote };
