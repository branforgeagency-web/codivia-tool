const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { UPLOAD_LIMITS: L } = require('../config/chartUploads');
const { DIFFICULTIES } = require('../models/chart.model');
const { UPLOAD_STATUS } = require('../models/chartUpload.model');
const { objectId } = require('./custom.validation');
const { answerRow, caseFields, encounterType } = require('./chartCase.validation');

// A file stored by POST /media-upload (charts folder). Only the key is trusted; the URL is rebuilt
// on the server, so a chart can't point at an outside link.
const sourceFile = Joi.object({
  key: Joi.string().trim().max(L.sourceKey).pattern(/^charts\/[A-Za-z0-9/_.-]+$/).required(),
  size: Joi.number().integer().min(0),
  mimeType: Joi.string().trim().max(120),
}).allow(null);

const text = (max) => Joi.string().trim().max(max).allow('');
const status = Joi.string().valid(...Object.values(UPLOAD_STATUS));
const uploadId = Joi.object({ uploadId: Joi.string().custom(objectId).required() });

// Drafts may have incomplete rows; publishing checks the answer key in the service.
const createUpload = {
  body: Joi.object({
    dept: Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN).required(),
    title: Joi.string().trim().min(1).max(L.title).required(),
    record: Joi.string().trim().min(1).max(L.record).required(),
    answerKey: Joi.array().items(answerRow).max(L.rows).default([]),
    // work queue: work type, documents, encounter banner, original charges, denial, grading extras
    ...caseFields,
    // Every new chart says whether it is outpatient or inpatient (drafts too).
    encounterType: encounterType.required().messages({ 'any.required': 'Choose the encounter type (OP or IP)' }),
    difficulty: Joi.string().valid(...DIFFICULTIES).default('moderate'),
    patient: Joi.object({
      name: Joi.string().trim().min(1).max(L.patientName),
      sex: Joi.string().valid('M', 'F'),
      age: Joi.number().integer().min(0).max(130),
    }),
    sourceName: Joi.string().trim().max(L.sourceName).allow(null, ''),
    sourceFile,
    status: status.default(UPLOAD_STATUS.DRAFT),
  }),
};

// Edit form (an upload or a chart in the pool): the whole chart as the form holds it.
const chartEditFields = {
  title: Joi.string().trim().min(1).max(L.title),
  record: Joi.string().trim().min(1).max(L.record),
  answerKey: Joi.array().items(answerRow).max(L.rows),
  ...caseFields,
  difficulty: Joi.string().valid(...DIFFICULTIES),
  patient: Joi.object({
    name: Joi.string().trim().min(1).max(L.patientName),
    sex: Joi.string().valid('M', 'F'),
    age: Joi.number().integer().min(0).max(130),
  }),
  // Changing the encounter / billing type of a chart students have already worked is refused (409)
  // until the admin confirms they reviewed the impact; the confirmation is written to the audit log.
  confirmEncounterChange: Joi.boolean(),
};

const getUpload = { params: uploadId };
const updateUpload = {
  params: uploadId,
  body: Joi.object({
    dept: Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN),
    sourceName: Joi.string().trim().max(L.sourceName).allow(null, ''),
    sourceFile,
    ...chartEditFields,
  }).min(1),
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

module.exports = { getUploads, createUpload, getUpload, updateUpload, setStatus, deleteUpload, chartEditFields };
