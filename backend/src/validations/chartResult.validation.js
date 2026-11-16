const Joi = require('joi');
const { CHART_ID_PATTERN } = require('../config/certificates');
const { DENIAL_DECISIONS, POA_VALUES, WORK_LIMITS: W } = require('../config/workQueue');
const { objectId } = require('./custom.validation');
const { draft } = require('./myChart.validation');

const text = (max) => Joi.string().trim().max(max).allow('');
const studentQuery = Joi.object({ student: Joi.string().custom(objectId) }); // managers only
const code = Joi.string().trim().max(W.code);

// The coded work, as the server grades it. Pointers are diagnosis codes (first = main reason).
const submitChart = {
  params: Joi.object({
    chartId: Joi.string().pattern(CHART_ID_PATTERN).required().messages({ 'string.pattern.base': 'chartId is not a valid chart ID' }),
  }),
  body: Joi.object({
    dx: Joi.array()
      .items(Joi.object({ code: code.required(), poa: Joi.string().valid('', ...POA_VALUES) }))
      .max(W.dx)
      .required(),
    lines: Joi.array()
      .items(
        Joi.object({
          code: code.required(),
          mods: Joi.array().items(Joi.string().trim().uppercase().max(2).allow('')).max(W.mods),
          units: Joi.number().integer().min(1).max(9999),
          ptrs: Joi.array().items(code).max(W.ptrs),
        })
      )
      .max(W.lines)
      .default([]),
    pcs: Joi.array().items(code).max(W.pcs).default([]),
    drg: text(300),
    disp: text(W.short),
    decision: Joi.string().valid('', ...DENIAL_DECISIONS),
    comment: text(W.comment),
    notified: Joi.boolean(),
    draft,
    timeSpent: Joi.number().integer().min(0).max(24 * 60 * 60),
  }),
};

const getResults = { query: studentQuery };
const getStats = { query: studentQuery };

module.exports = { submitChart, getResults, getStats };
