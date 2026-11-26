const Joi = require('joi');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { CHART_ID_PATTERN } = require('../config/certificates');
const { AUDIT_LIMITS: L, AUDIT_QUEUE_TAB_KEYS, AUDIT_VERDICT_LIST, FINDING_TYPE_KEYS } = require('../config/auditors');
const { objectId } = require('./custom.validation');

const page = Joi.number().integer().min(1).default(1);
const limit = Joi.number().integer().min(1).max(L.maxLimit).default(L.defaultLimit);
const search = Joi.string().trim().max(L.search).allow('');
const dept = Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN);
const auditParams = Joi.object({
  studentId: Joi.string().custom(objectId).required(),
  chartId: Joi.string().trim().uppercase().pattern(CHART_ID_PATTERN).required(),
});

const getStudents = { query: Joi.object({ search, dept, page, limit }) };

const getQueue = {
  query: Joi.object({
    status: Joi.string().valid(...AUDIT_QUEUE_TAB_KEYS).default('pending'),
    student: Joi.string().custom(objectId),
    dept,
    priority: Joi.boolean(),
    search,
    page,
    limit,
  }),
};

const getAudit = { params: auditParams };

// complete: false saves a draft; true completes (or updates) the audit and sets the official score.
const saveAudit = {
  params: auditParams,
  body: Joi.object({
    resultAt: Joi.number().integer().min(0).required(),
    verdict: Joi.string().valid(...AUDIT_VERDICT_LIST).allow(null),
    finalAccuracy: Joi.number().integer().min(0).max(100).allow(null),
    findings: Joi.array()
      .items(
        Joi.object({
          code: Joi.string().trim().uppercase().max(L.code).allow(''),
          type: Joi.string().valid(...FINDING_TYPE_KEYS).required(),
          comment: Joi.string().trim().max(L.findingComment).allow(''),
        })
      )
      .max(L.findings)
      .default([]),
    feedback: Joi.string().trim().max(L.feedback).allow('').default(''),
    complete: Joi.boolean().default(false),
  }),
};

module.exports = { getStudents, getQueue, getAudit, saveAudit };
