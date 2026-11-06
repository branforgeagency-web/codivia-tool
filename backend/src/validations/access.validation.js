const Joi = require('joi');
const { ASSIGNABLE_ROLES } = require('../config/roles');
const { MODULE_KEYS } = require('../config/modules');

const updatePermission = {
  params: Joi.object({
    role: Joi.string().valid(...ASSIGNABLE_ROLES).required(),
    module: Joi.string().valid(...MODULE_KEYS).required(),
  }),
  body: Joi.object({
    view: Joi.boolean(),
    add: Joi.boolean(),
    edit: Joi.boolean(),
    delete: Joi.boolean(),
  }).min(1),
};

module.exports = { updatePermission };
