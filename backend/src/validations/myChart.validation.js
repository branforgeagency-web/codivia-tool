const Joi = require('joi');
const { CODING_STEP_KEYS } = require('../config/codingSteps');
const { DEPARTMENT_KEY_PATTERN } = require('../config/departments');
const { CHART_ID_PATTERN } = require('../config/certificates');
const { DENIAL_DECISIONS, WORK_LIMITS: W, WORK_TYPE_LIST } = require('../config/workQueue');
const { DX_CLASS_LIST } = require('../config/encounter');

const page = Joi.number().integer().min(1).default(1);
const limit = Joi.number().integer().min(1).max(100).default(10);
const search = Joi.string().trim().max(100).allow('');
const deptKey = Joi.string().trim().uppercase().pattern(DEPARTMENT_KEY_PATTERN).required();
const chartId = Joi.string().trim().uppercase().pattern(CHART_ID_PATTERN).required();
const chartParams = Joi.object({ deptKey, chartId });

const str = (max) => Joi.string().max(max).allow('');
const id = Joi.string().max(40);
const code = str(W.code);
const timeSpent = Joi.number().integer().min(0).max(24 * 60 * 60);

// The workspace state the browser autosaves. Strict: unknown keys are rejected, every list is capped.
const draft = Joi.object({
  v: Joi.number().integer().min(1).max(99),
  dx: Joi.array()
    // cls: diagnosis classification (primary / principal / secondary); the sequence is the list order.
    // Drafts may be incomplete (no first-listed diagnosis yet); submitting checks them (utils/diagnosis.js).
    .items(Joi.object({ id: id.required(), code: code.required(), desc: str(W.desc), poa: str(6), cls: Joi.string().valid('', ...DX_CLASS_LIST), ev: Joi.array().items(id).max(W.evidence) }))
    .max(W.dx),
  lines: Joi.array()
    .items(
      Joi.object({
        id: id.required(),
        code: code.required(),
        desc: str(W.desc),
        mods: Joi.array().items(str(2)).max(W.mods),
        units: Joi.number().integer().min(1).max(9999),
        ptrs: Joi.array().items(id).max(W.ptrs),
      })
    )
    .max(W.lines),
  pcs: Joi.array()
    .items(Joi.object({ id: id.required(), code: code.required(), desc: str(W.desc), date: str(20), ev: Joi.array().items(id).max(W.evidence) }))
    .max(W.pcs),
  drg: str(300),
  abs: Joi.object({ admitType: str(W.short), admitSrc: str(W.short), disp: str(W.short), attending: str(W.short) }),
  emTime: str(4),
  ptGrid: Joi.string().valid('new', 'est', 'ed'),
  evidence: Joi.array()
    .items(Joi.object({ id: id.required(), doc: str(40).required(), text: str(W.evidenceText).required(), code: code.required() }))
    .max(W.evidence),
  notes: str(W.notes),
  acks: Joi.array().items(str(300)).max(100),
  // Coding steps the student confirmed have no codes at this visit (config/codingSteps.js).
  noneSteps: Joi.array().items(Joi.string().valid(...CODING_STEP_KEYS)).unique().max(CODING_STEP_KEYS.length),
  decision: Joi.string().valid('', ...DENIAL_DECISIONS),
  comment: str(W.comment),
  step: Joi.number().integer().min(1).max(3),
  session: str(20),
  notified: Joi.boolean(),
}).unknown(false);

const getMyDepartments = {
  query: Joi.object({ search, status: Joi.string().valid('all', 'active', 'new', 'complete').default('all'), page, limit }),
};

const getMyQueue = {
  params: Joi.object({ deptKey }),
  query: Joi.object({
    search,
    status: Joi.string().valid('all', 'todo', 'deferred', 'done').default('todo'),
    type: Joi.string().valid('all', ...WORK_TYPE_LIST).default('all'),
    page,
    limit,
  }),
};

const getMyChart = { params: chartParams };
const getWork = { params: chartParams };
const openSession = { params: chartParams };

const saveWork = {
  params: chartParams,
  body: Joi.object({ draft: draft.required(), timeSpent }),
};

const deferChart = {
  params: chartParams,
  body: Joi.object({ reason: Joi.string().max(W.short).required(), comment: str(W.comment), draft, timeSpent }),
};

const transferChart = {
  params: chartParams,
  body: Joi.object({
    queue: Joi.string().max(W.short).required(),
    reason: Joi.string().max(W.short).required(),
    comment: Joi.string().trim().min(3).max(500).required(),
    draft,
    timeSpent,
  }),
};

const sendQuery = {
  params: chartParams,
  body: Joi.object({
    to: Joi.string().trim().max(W.short).required(),
    indicators: str(W.comment),
    question: Joi.string().trim().min(10).max(W.comment).required(),
    options: Joi.array().items(Joi.string().trim().max(200)).max(8),
  }),
};

const addComment = {
  params: chartParams,
  body: Joi.object({ text: Joi.string().trim().min(1).max(W.comment).required() }),
};

module.exports = { draft, getMyDepartments, getMyQueue, getMyChart, getWork, openSession, saveWork, deferChart, transferChart, sendQuery, addComment };
