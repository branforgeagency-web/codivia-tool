const Joi = require('joi');
const { ALL_ROLES } = require('../config/roles');
const { ALL_USER_STATUSES } = require('../config/userStatus');
const { USER_LIMITS, USER_SORT_FIELDS } = require('../config/users');
const { objectId, strongPassword } = require('./custom.validation');

const id = Joi.string().custom(objectId);
const userIdParam = Joi.object({ userId: id.required() });

const name = Joi.string().trim().min(1).max(USER_LIMITS.name);
const email = Joi.string().trim().lowercase().email().max(USER_LIMITS.email);
const password = Joi.string().custom(strongPassword);
const role = Joi.string().valid(...ALL_ROLES);
const status = Joi.string().valid(...ALL_USER_STATUSES);

const createUser = {
  body: Joi.object({ name: name.required(), email: email.required(), password: password.required(), role, status }),
};

const getUsers = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow(''),
    role,
    status,
    sortBy: Joi.string().valid(...USER_SORT_FIELDS).default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const getUser = { params: userIdParam };
const updateUser = { params: userIdParam, body: Joi.object({ name, email, password, role, status }).min(1) };
const deleteUser = { params: userIdParam };

module.exports = { createUser, getUsers, getUser, updateUser, deleteUser };
