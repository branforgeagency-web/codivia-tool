const Joi = require('joi');
const { CASE_LIMITS: L } = require('../config/chartUploads');
const { CHART_IMPORT } = require('../config/chartImport');
const { DENIAL_DECISIONS, POA_VALUES, WORK_TYPE_LIST } = require('../config/workQueue');
const { BILLING_TYPE_LIST, ENCOUNTER_TYPE_LIST } = require('../config/encounter');

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
      // Note details (NOTE blocks of an uploaded file): shown in Notes/Trans and the Notes activity.
      type: text(L.short),
      author: text(L.short),
      specialty: text(L.short),
      date: text(L.short),
      status: text(L.short),
      recipient: text(L.short), // letters: who the letter was sent to
      body: Joi.string().trim().min(1).max(L.docBody).required(),
    })
  )
  .max(L.documents)
  .unique('key');

// Episodes of care (pregnancy, therapy, oncology, a surgery and its follow-ups …). Visits join one
// by name: encounter.episode (this visit) and previousRecords[].episode.
const episodes = Joi.array()
  .items(
    Joi.object({
      key: Joi.string().trim().pattern(/^[a-z0-9_-]{1,30}$/i).required(),
      name: Joi.string().trim().min(1).max(L.short).required(),
      type: text(L.short),
      status: text(L.short),
      start: text(L.short),
      end: text(L.short),
      provider: text(L.short),
      dx: text(L.desc),
      note: text(L.why),
    })
  )
  .max(L.episodes)
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
      episode: text(L.short), // name of the episode this visit belongs to
      noteType: text(L.short), // e.g. Operative Report; default Progress Notes
      arrival: text(L.short), // ED visit details
      departure: text(L.short),
      acuity: text(L.short),
      disposition: text(L.short),
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
  episode: text(L.short), // name of the episode this visit belongs to
  arrival: text(L.short), // ED visit: arrival, departure, triage acuity (ESI), disposition
  departure: text(L.short),
  acuity: text(L.short),
  disposition: text(L.short),
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
  uncertain: Joi.boolean(), // diagnosis documented as uncertain (probable / suspected) — see Chart model
});

// OP / IP, and for IP the billing type. Required on new uploads (createUpload); publishing checks
// that an IP chart has its billing type (chartUpload.service checkPublishable).
const encounterType = Joi.string().trim().uppercase().valid(...ENCOUNTER_TYPE_LIST);
const billingType = Joi.string().trim().lowercase().valid(...BILLING_TYPE_LIST).allow('', null);

// A scan / photo attached to a Media item (POST /media-upload, folder chartMedia). The URL is
// added when the chart is read (utils/chartMedia.js), so only the key is stored.
const mediaFile = Joi.object({
  key: Joi.string().trim().max(400).required(),
  name: text(255),
  size: Joi.number().integer().min(0),
  mimeType: text(100),
  folder: text(30),
  url: Joi.any().strip(),
});

// Structured results / orders, one list per kind; the fields come from config/chartImport.js.
const clinical = Joi.object(
  Object.fromEntries(
    Object.entries(CHART_IMPORT.clinicalRows).map(([kind, { fields }]) => [
      kind,
      Joi.array()
        .items(
          Joi.object({
            ...Object.fromEntries(fields.map((f) => [f, text(L.short)])),
            ...(kind === 'media' ? { file: mediaFile } : {}),
          })
        )
        .max(L.clinicalRows),
    ])
  )
);

const caseFields = {
  clinical,
  encounterType,
  billingType,
  workType: Joi.string().valid(...WORK_TYPE_LIST).default('code'),
  documents,
  encounter,
  original,
  denial,
  previousRecords,
  episodes,
  keyMeta,
  cdiResponse: text(L.why),
};

module.exports = { caseFields, answerRow, encounterType };
