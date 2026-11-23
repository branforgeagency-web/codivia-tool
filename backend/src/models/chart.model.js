const mongoose = require('mongoose');
const { WORK_TYPE_LIST, WORK_TYPES } = require('../config/workQueue');
const { toJSON } = require('./plugins');

const { Mixed } = mongoose.Schema.Types;

const DIFFICULTIES = ['beginner', 'moderate', 'advanced'];
const SOURCES = ['builtin', 'upload'];

// One audited code. The optional fields make the grading stricter when they are set:
//   poa   - present-on-admission indicator (inpatient diagnoses)
//   mods  - modifiers the charge line must carry (CPT/HCPCS)
//   units - units the charge line must bill
//   ptrs  - the diagnosis codes the charge line must point to, first = main reason
const answerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    desc: { type: String, required: true },
    type: { type: String, required: true }, // PDx, SDx, Dx, CPT, HCPCS, MOD, PCS, PDGM, DRG
    why: { type: String, required: true },
    poa: { type: String, default: undefined },
    mods: { type: [String], default: undefined },
    units: { type: Number, default: undefined },
    ptrs: { type: [String], default: undefined },
  },
  { _id: false }
);

// A chart can carry several source documents (ED note, H&P, flowsheet ...). Without them the
// workspace shows `record` as the only document. Bodies are plain text: "HEADING:" lines start sections.
const documentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    sub: { type: String, default: '' },
    body: { type: String, required: true },
  },
  { _id: false }
);

// _id is the chart ID (e.g. "ANES-0001"), so toJSON exposes it as `id`, the same as the frontend data.
// `position` is the 1-based index within the department. Allocations ({start,end}) refer to it.
const chartSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    dept: { type: String, required: true, uppercase: true, trim: true },
    deptName: { type: String, required: true },
    position: { type: Number, required: true, min: 1 },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    title: { type: String, required: true },
    patient: {
      name: { type: String, required: true },
      sex: { type: String, enum: ['M', 'F'], required: true },
      age: { type: Number, required: true, min: 0 },
    },
    record: { type: String, required: true },
    answerKey: {
      type: [answerSchema],
      validate: [(v) => v.length > 0, 'answerKey must have at least one code'],
    },
    handwritten: { type: Boolean, default: false },
    source: { type: String, enum: SOURCES, default: 'builtin' },

    // ---- work queue (all optional; plain charts are "code from the documentation") ----
    workType: { type: String, enum: WORK_TYPE_LIST, default: WORK_TYPES.CODE },
    documents: { type: [documentSchema], default: undefined },
    // Banner fields: { mrn, acct, encounterId, dos, admit, discharge, los, provider, specialty,
    //   visitType, pos, facility, payer, plan, member, ptype ('new'|'est'), lastSeen, allergy }
    encounter: { type: Mixed, default: undefined },
    // What arrives with a review / DRG-validation / denial chart:
    //   { dx: [{ code, poa }], lines: [{ code, mods, units, ptrs, remit }], pcs: [code], disp, rules: [title] }
    original: { type: Mixed, default: undefined },
    // Denial details: { invoice: { num, icn, received, billed, allowed, daysToAppeal }, history: [[date, event, detail, amount]] }
    denial: { type: Mixed, default: undefined },
    // The patient's previous medical records, added with the chart (shown under "Previous records";
    // the student can carry the codes forward). These are earlier visits, not this chart's answer key:
    //   [{ key, title, dos, provider, facility, body, codes: [{ code, desc, type, poa, mods, units }] }]
    previousRecords: { type: Mixed, default: undefined },
    // Graded extras that are not codes: { disp, decision }. Never sent to students.
    keyMeta: { type: Mixed, default: undefined, private: true },
    // The physician's answer to a CDI query on this chart. Sent only once the query is answered.
    cdiResponse: { type: String, default: undefined, private: true },
  },
  { timestamps: true }
);

chartSchema.index({ dept: 1, position: 1 }, { unique: true });
chartSchema.index({ dept: 1, workType: 1 });
chartSchema.plugin(toJSON);

module.exports = mongoose.model('Chart', chartSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
