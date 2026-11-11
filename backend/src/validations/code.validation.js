const Joi = require('joi');
const { CODE_SYSTEM_KEYS, ALL_CODE_FILTERS, ALL_ICD_INDEXES, ALL_ICD_TABLES, CODE_LIMITS } = require('../config/codes');

const system = Joi.string().trim().uppercase().valid(...CODE_SYSTEM_KEYS);
const code = Joi.string().trim().max(20);
const indexParam = Joi.object({ index: Joi.string().valid(...ALL_ICD_INDEXES).required() });
const optionalQuery = Joi.string().trim().max(CODE_LIMITS.query.max).allow('');

const searchCodes = {
  query: Joi.object({
    q: Joi.string().trim().min(CODE_LIMITS.query.min).max(CODE_LIMITS.query.max).required(),
    // ?system=CPT&system=HCPCS or ?system=CPT,HCPCS
    system: Joi.alternatives().try(
      Joi.array().items(system).unique(),
      Joi.string().custom((value, helpers) => {
        const list = value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        const bad = list.find((s) => !CODE_SYSTEM_KEYS.includes(s));
        return bad ? helpers.message(`system must be one of ${CODE_SYSTEM_KEYS.join(', ')}`) : [...new Set(list)];
      })
    ),
    filter: Joi.string().valid(...ALL_CODE_FILTERS),
    limit: Joi.number().integer().min(1).max(CODE_LIMITS.search.max).default(CODE_LIMITS.search.default),
  }),
};

const getCode = { params: Joi.object({ system: system.required(), code: code.required() }) };
const getFamily = { params: Joi.object({ stem: code.required() }) };
const getNotes = { params: Joi.object({ code: code.required() }) };

const validateCodes = {
  body: Joi.object({
    codes: Joi.array().items(Joi.string().trim().max(20).allow('')).min(1).max(CODE_LIMITS.validateMax).required(),
  }),
};

const searchIndex = { params: indexParam, query: Joi.object({ q: optionalQuery }) };
const resolveIndexRef = { params: indexParam, query: Joi.object({ ref: Joi.string().trim().min(1).max(300).required() }) };

const searchTable = {
  params: Joi.object({ table: Joi.string().valid(...ALL_ICD_TABLES).required() }),
  query: Joi.object({ q: optionalQuery }),
};

module.exports = {
  searchCodes,
  getCode,
  getFamily,
  getNotes,
  validateCodes,
  searchIndex,
  resolveIndexRef,
  searchTable,
};
