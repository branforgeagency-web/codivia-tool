const Joi = require('joi');

const getMyProgress = {
  query: Joi.object({
    status: Joi.string().valid('all', 'certified', 'in-progress', 'not-started').default('all'),
  }),
};

module.exports = { getMyProgress };
