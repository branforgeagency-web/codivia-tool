const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { STUDENT_STATUS_KEYS, ADMIN_STUDENT_LIMITS: L } = require('../config/adminStudents');
const { objectId, strongPassword } = require('./custom.validation');
const { USER_LIMITS } = require('../config/users');
const { ALL_USER_STATUSES } = require('../config/userStatus');

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

// Add a student by hand: the admin sets the student's password.
const createStudent = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(USER_LIMITS.name).required(),
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email).required(),
    password: Joi.string().custom(strongPassword).required(),
  }),
};

// Edit a student: any of name / email / new password (blank password = keep the current one).
const updateStudent = {
  params: userIdParam,
  body: Joi.object({
    name: Joi.string().trim().min(1).max(USER_LIMITS.name),
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email),
    password: Joi.string().custom(strongPassword),
  }).min(1),
};
const deleteStudent = { params: userIdParam };

// Disable / enable a student's account.
const setStatus = {
  params: userIdParam,
  body: Joi.object({ status: Joi.string().valid(...ALL_USER_STATUSES).required() }),
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

module.exports = { createStudent, updateStudent, deleteStudent, setStatus, getStudents, getStudent, getAllocations, setAllocations };
