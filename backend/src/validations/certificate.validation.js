const Joi = require('joi');
const { CERT_NUMBER_PATTERN, CERT_SORT_FIELDS } = require('../config/certificates');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { objectId } = require('./custom.validation');

const id = Joi.string().custom(objectId);

const getCertificates = {
  query: Joi.object({
    student: id, // managers only
    dept: Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN),
    sortBy: Joi.string().valid(...CERT_SORT_FIELDS).default('issuedAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const getCertificate = { params: Joi.object({ certificateId: id.required() }) };

const verifyCertificate = {
  params: Joi.object({
    certificateNo: Joi.string().trim().uppercase().pattern(CERT_NUMBER_PATTERN).required().messages({
      'string.pattern.base': 'That is not a valid certificate number',
    }),
  }),
};

module.exports = { getCertificates, getCertificate, verifyCertificate };
