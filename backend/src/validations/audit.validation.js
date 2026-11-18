const Joi = require('joi');
const { AUDIT_CATEGORY_KEYS, AUDIT_ACTION_KEYS, AUDIT_LIMITS: L } = require('../config/auditLog');
const { objectId } = require('./custom.validation');

// Audit Log page: ?category=&actor=&action=&from=YYYY-MM-DD&to=YYYY-MM-DD&search=&page=&limit=
const getLogs = {
  query: Joi.object({
    category: Joi.string().valid('all', ...AUDIT_CATEGORY_KEYS).default('all'),
    actor: Joi.string().custom(objectId).allow(''),
    action: Joi.string().valid(...AUDIT_ACTION_KEYS).allow(''),
    from: Joi.date().iso().allow(''),
    to: Joi.date().iso().min(Joi.ref('from')).allow(''),
    search: Joi.string().trim().max(L.search).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit),
  }),
};

module.exports = { getLogs };
