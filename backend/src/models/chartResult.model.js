const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const { ObjectId, Mixed } = mongoose.Schema.Types;

// A student's latest score on one chart: one document per (student, chart), so submitting a chart
// again overwrites it and a chart only ever counts once towards a certificate.
// The score fields are the frontend's saved progress entry, unchanged.
const chartResultSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'User', required: true },
    chart: { type: String, ref: 'Chart', required: true },
    dept: { type: String, required: true },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    total: { type: Number, required: true, min: 0 },
    correct: { type: Number, required: true, min: 0 }, // how many codes were right
    at: { type: Number, required: true }, // when submitted, ms since epoch
    drgOk: Boolean,
    miss: { type: [String], default: undefined }, // codes missed
    wrong: { type: [Mixed], default: undefined }, // [entered code, audited code] pairs
    // What was graded, kept for the auditor (not sent in the students' results map: see RESULT_LIST_FIELDS).
    submission: { type: Mixed, default: undefined }, // the submitted coding sheet (dx, lines, pcs, drg …)
    checks: { type: [Mixed], default: undefined }, // gradeWork checklist: [{ ok, title, why, kind }]
    // Set when an auditor completes an audit of THIS submission (a new submission replaces the row).
    // `accuracy` then holds the audited score and autoAccuracy the automatic one.
    autoAccuracy: { type: Number, min: 0, max: 100, default: undefined },
    audit: { type: Mixed, default: undefined }, // { verdict, finalAccuracy, autoAccuracy, findings, feedback, auditorName, at }
  },
  { versionKey: false }
);

chartResultSchema.index({ student: 1, chart: 1 }, { unique: true });
chartResultSchema.index({ student: 1, dept: 1 });
chartResultSchema.plugin(toJSON);

module.exports = mongoose.model('ChartResult', chartResultSchema);
// Fields left out when many results are listed at once (they are large and only the auditor needs them).
module.exports.RESULT_LIST_FIELDS = '-_id -student -submission -checks';
