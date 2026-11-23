const Joi = require('joi');
const { CASE_LIMITS: L } = require('../config/chartUploads');
const { DENIAL_DECISIONS, POA_VALUES, WORK_TYPE_LIST } = require('../config/workQueue');

// The work-queue fields a chart can carry (same shape as the Chart model). Shared by the admin
// upload (drafts may be incomplete; publishing checks completeness in the service).
const text = (max) => Joi.string().trim().max(max).allow('');
const code = text(L.code);
const codeList = (max) => Joi.array().items(Joi.string().trim().uppercase().max(L.code)).max(max);
const mods = Joi.array().items(Joi.string().trim().uppercase().max(2)).max(4);

const documents = Joi.array()
  .items(
    Joi.object({
      key: Joi.string().trim().pattern(/^[a-z0-9_-]{1,30}$/i).required(),
      title: Joi.string().trim().min(1).max(L.docTitle).required(),
      sub: text(L.short),
      body: Joi.string().trim().min(1).max(L.docBody).required(),
    })
  )
  .max(L.documents)
  .unique('key');

// The patient's previous medical records (earlier visits) and the codes billed on them.
const previousRecords = Joi.array()
  .items(
    Joi.object({
      key: Joi.string().trim().pattern(/^[a-z0-9_-]{1,30}$/i).required(),
      title: Joi.string().trim().min(1).max(L.docTitle).required(),
      dos: text(L.short),
      provider: text(L.short),
      facility: text(L.short),
      body: Joi.string().trim().min(1).max(L.docBody).required(),
      codes: Joi.array()
        .items(
          Joi.object({
            code: code.required(),
            desc: text(L.desc),
            type: text(10), // PDx, SDx, Dx, CPT, HCPCS, PCS, DRG
            poa: Joi.string().valid('', ...POA_VALUES),
            mods,
            units: Joi.number().integer().min(1).max(9999).allow(null),
          })
        )
        .max(L.previousCodes),
    })
  )
  .max(L.previousRecords)
  .unique('key');

const encounter = Joi.object({
  mrn: text(L.short),
  acct: text(L.short),
  encounterId: text(L.short),
  dos: text(L.short),
  admit: text(L.short),
  discharge: text(L.short),
  los: Joi.number().integer().min(0).max(365).allow(null),
  provider: text(L.short),
  specialty: text(L.short),
  visitType: text(L.short),
  pos: text(L.short),
  facility: text(L.short),
  payer: text(L.short),
  plan: text(L.short),
  member: text(L.short),
  ptype: Joi.string().valid('', 'new', 'est'),
  lastSeen: text(L.short),
  allergy: text(L.short),
});

const original = Joi.object({
  dx: Joi.array()
    .items(Joi.object({ code: code.required(), poa: Joi.string().valid('', ...POA_VALUES) }))
    .max(25),
  lines: Joi.array()
    .items(
      Joi.object({
        code: code.required(),
        mods,
        units: Joi.number().integer().min(1).max(9999),
        ptrs: codeList(4),
        remit: text(10),
        billed: Joi.number().min(0).max(1e7),
        paid: Joi.number().min(0).max(1e7),
      })
    )
    .max(50),
  pcs: codeList(25),
  disp: text(L.short),
  drg: text(300),
  rules: Joi.array().items(Joi.string().trim().max(L.short)).max(20),
  enteredBy: text(L.short),
});

const denial = Joi.object({
  queue: text(L.short),
  invoice: Joi.object({
    num: text(L.short),
    icn: text(L.short),
    status: text(L.short),
    received: text(L.short),
    billed: Joi.number().min(0).max(1e7),
    allowed: Joi.number().min(0).max(1e7),
    daysToAppeal: Joi.number().integer().min(0).max(3650).allow(null),
  }),
  history: Joi.array().items(Joi.array().items(text(L.short)).length(4)).max(50),
});

const keyMeta = Joi.object({
  disp: text(L.short),
  dispWhy: text(L.why),
  decision: Joi.string().valid('', ...DENIAL_DECISIONS),
  decisionWhy: text(L.why),
  extraWhy: Joi.object().pattern(Joi.string().max(L.code), Joi.string().max(L.why)).max(50),
});

// One answer key row, with the optional stricter checks.
const answerRow = Joi.object({
  code: text(L.code),
  type: text(10),
  desc: text(L.desc),
  why: text(L.why),
  poa: Joi.string().valid('', ...POA_VALUES),
  mods,
  units: Joi.number().integer().min(1).max(9999).allow(null),
  ptrs: codeList(4),
});

const caseFields = {
  workType: Joi.string().valid(...WORK_TYPE_LIST).default('code'),
  documents,
  encounter,
  original,
  denial,
  previousRecords,
  keyMeta,
  cdiResponse: text(L.why),
};

module.exports = { caseFields, answerRow };
