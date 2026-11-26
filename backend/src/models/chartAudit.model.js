const mongoose = require('mongoose');
const { AUDIT_STATUS, AUDIT_VERDICT_LIST, FINDING_TYPE_KEYS } = require('../config/auditors');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

const findingSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' }, // the code the finding is about (blank = whole chart)
    type: { type: String, enum: FINDING_TYPE_KEYS, required: true },
    comment: { type: String, default: '' },
  },
  { _id: false }
);

// An auditor's review of one student's submitted chart. One row per (student, chart).
// `resultAt` is the ChartResult.at it reviewed: when the student submits again, the result gets a
// new `at`, so the audit no longer matches and the chart is back in the auditor's queue.
const chartAuditSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'User', required: true },
    chart: { type: String, ref: 'Chart', required: true },
    dept: { type: String, required: true },
    auditor: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: [AUDIT_STATUS.DRAFT, AUDIT_STATUS.COMPLETED], default: AUDIT_STATUS.DRAFT },
    resultAt: { type: Number, required: true },
    verdict: { type: String, enum: AUDIT_VERDICT_LIST, default: undefined },
    autoAccuracy: { type: Number, min: 0, max: 100, required: true },
    finalAccuracy: { type: Number, min: 0, max: 100, default: undefined },
    findings: { type: [findingSchema], default: [] },
    feedback: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chartAuditSchema.index({ student: 1, chart: 1 }, { unique: true });
chartAuditSchema.index({ auditor: 1, status: 1 });
chartAuditSchema.plugin(toJSON);

module.exports = mongoose.model('ChartAudit', chartAuditSchema);
