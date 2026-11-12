const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { STUDENT_STATUS_KEYS, ADMIN_STUDENT_LIMITS: L } = require('../config/adminStudents');
const { objectId } = require('./custom.validation');

const userIdParam = Joi.object({ userId: Joi.string().custom(objectId).required() });
const chart = Joi.number().integer().min(1);
const range = Joi.object({
  start: chart.required(),
  end: chart.min(Joi.ref('start')).required().messages({ 'number.min': 'end must be the same as or after start' }),
});

const getStudents = {
  query: Joi.object({
    search: Joi.string().trim().max(L.search).allow(''),
    status: Joi.string().valid(...STUDENT_STATUS_KEYS).default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit),
  }),
};

const getStudent = { params: userIdParam };
const getAllocations = { params: userIdParam };

// { depts: { CARDIO: { start, end }, ... } }: the student's complete allocation; {} removes all.
const setAllocations = {
  params: userIdParam,
  body: Joi.object({
    depts: Joi.object().pattern(Joi.string().pattern(DEPARTMENT_KEY_PATTERN), range).max(200).required(),
  }),
};

module.exports = { getStudents, getStudent, getAllocations, setAllocations };
