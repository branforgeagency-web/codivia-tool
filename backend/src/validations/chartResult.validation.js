const Joi = require('joi');
const { RESULT_LIMITS: L, CHART_ID_PATTERN } = require('../config/certificates');
const { objectId } = require('./custom.validation');

const text = (max) => Joi.string().trim().max(max).allow('');
const studentQuery = Joi.object({ student: Joi.string().custom(objectId) }); // managers only

// `rows` are the coding sheet rows as the frontend holds them.
const submitChart = {
  params: Joi.object({
    chartId: Joi.string().pattern(CHART_ID_PATTERN).required().messages({ 'string.pattern.base': 'chartId is not a valid chart ID' }),
  }),
  body: Joi.object({
    rows: Joi.array()
      .items(Joi.object({ code: text(L.code), desc: text(L.desc), mod: text(L.mod), poa: text(L.poa) }))
      .max(L.rows)
      .required(),
    drg: text(L.drg),
  }),
};

const getResults = { query: studentQuery };
const getStats = { query: studentQuery };

module.exports = { submitChart, getResults, getStats };
