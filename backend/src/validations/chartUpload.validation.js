const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { UPLOAD_LIMITS: L } = require('../config/chartUploads');
const { DIFFICULTIES } = require('../models/chart.model');
const { UPLOAD_STATUS } = require('../models/chartUpload.model');
const { objectId } = require('./custom.validation');

const text = (max) => Joi.string().trim().max(max).allow('');
const status = Joi.string().valid(...Object.values(UPLOAD_STATUS));
const uploadId = Joi.object({ uploadId: Joi.string().custom(objectId).required() });

// Drafts may have incomplete rows; publishing checks the answer key in the service.
const createUpload = {
  body: Joi.object({
    dept: Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN).required(),
    title: Joi.string().trim().min(1).max(L.title).required(),
    record: Joi.string().trim().min(1).max(L.record).required(),
    answerKey: Joi.array()
      .items(Joi.object({ code: text(L.code), type: text(L.type), desc: text(L.desc), why: text(L.why) }))
      .max(L.rows)
      .default([]),
    difficulty: Joi.string().valid(...DIFFICULTIES).default('moderate'),
    patient: Joi.object({
      name: Joi.string().trim().min(1).max(L.patientName),
      sex: Joi.string().valid('M', 'F'),
      age: Joi.number().integer().min(0).max(130),
    }),
    sourceName: Joi.string().trim().max(L.sourceName).allow(null, ''),
    status: status.default(UPLOAD_STATUS.DRAFT),
  }),
};

const getUploads = {
  query: Joi.object({
    status: Joi.string().valid('all', ...Object.values(UPLOAD_STATUS)).default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

const setStatus = { params: uploadId, body: Joi.object({ status: status.required() }) };
const deleteUpload = { params: uploadId };

module.exports = { getUploads, createUpload, setStatus, deleteUpload };
