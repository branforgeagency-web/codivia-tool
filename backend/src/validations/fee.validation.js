const Joi = require('joi');
const { FEE_LIMITS } = require('../config/fees');

// ?codes=99214,20610,J1885 (or ?codes=99214&codes=20610) -> unique, upper-case codes without dots.
const codeList = Joi.alternatives()
  .try(Joi.array().items(Joi.string().trim().max(20)), Joi.string().trim().max(FEE_LIMITS.codesMax * 21))
  .custom((value, helpers) => {
    const list = [...new Set((Array.isArray(value) ? value : value.split(',')).map((c) => String(c).replace(/[.\s-]/g, '').toUpperCase()).filter(Boolean))];
    if (!list.length) return helpers.message('codes must list at least one code');
    if (list.length > FEE_LIMITS.codesMax) return helpers.message(`at most ${FEE_LIMITS.codesMax} codes at a time`);
    if (list.some((c) => !/^[A-Z0-9]{4,7}$/.test(c))) return helpers.message('codes must be CPT / HCPCS codes');
    return list;
  });

const getRvus = { query: Joi.object({ codes: codeList.required() }) };

module.exports = { getRvus };
