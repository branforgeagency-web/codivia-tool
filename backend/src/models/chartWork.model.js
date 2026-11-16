const mongoose = require('mongoose');
const { WORK_STATUS, WORK_STATUS_LIST } = require('../config/workQueue');
const { toJSON } = require('./plugins');

const { ObjectId, Mixed } = mongoose.Schema.Types;

// A physician (CDI) query the student sent from the workspace. The answer becomes visible once
// `answerAt` has passed (simulated provider turnaround).
const querySchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    indicators: { type: String, default: '' },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    sentAt: { type: Date, required: true },
    answerAt: { type: Date, required: true },
    answer: { type: String, required: true },
  },
  { _id: true }
);

const activitySchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    kind: { type: String, required: true }, // opened, saved, comment, query, answer, defer, transfer, submit
    text: { type: String, required: true },
  },
  { _id: false }
);

// One student's work on one chart: the autosaved workspace draft, where the chart sits in their
// queue (in progress / deferred / transferred / done), queries, comments and time spent.
// The score itself lives in ChartResult.
const chartWorkSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'User', required: true },
    chart: { type: String, ref: 'Chart', required: true },
    dept: { type: String, required: true },
    status: { type: String, enum: WORK_STATUS_LIST, default: WORK_STATUS.IN_PROGRESS },
    draft: { type: Mixed, default: null }, // validated by chartWork validation before it is saved
    timeSpent: { type: Number, default: 0, min: 0 }, // seconds, across sessions
    defer: { reason: String, comment: String, at: Date },
    transfer: { queue: String, reason: String, comment: String, at: Date },
    queries: { type: [querySchema], default: [] },
    session: { type: String, default: null }, // denial charge-correction session number (server-issued)
    activity: { type: [activitySchema], default: [] },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chartWorkSchema.index({ student: 1, chart: 1 }, { unique: true });
chartWorkSchema.index({ student: 1, dept: 1, status: 1 });
chartWorkSchema.plugin(toJSON);

module.exports = mongoose.model('ChartWork', chartWorkSchema);
