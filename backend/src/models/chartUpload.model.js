const mongoose = require('mongoose');
const { DIFFICULTIES } = require('./chart.model');
const { WORK_TYPE_LIST, WORK_TYPES } = require('../config/workQueue');
const { ENCOUNTER_TYPE_LIST, BILLING_TYPE_LIST } = require('../config/encounter');
const { toJSON } = require('./plugins');

const { ObjectId, Mixed } = mongoose.Schema.Types;

const UPLOAD_STATUS = Object.freeze({ DRAFT: 'draft', PUBLISHED: 'published' });

// A chart an admin uploaded on the Upload page. Drafts live only here, so they never reach the chart
// pool, allocations or students. Publishing copies it into Chart (source: 'upload') as `chart`;
// moving it back to draft removes that Chart.
// Drafts may be incomplete (empty desc / why), so the answer key is checked only when publishing.
// The optional poa / mods / units / ptrs make grading stricter (same as Chart's answer key).
const uploadAnswerSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, default: '' },
    type: { type: String, trim: true, default: '' },
    desc: { type: String, default: '' },
    why: { type: String, default: '' },
    poa: { type: String, default: undefined },
    mods: { type: [String], default: undefined },
    units: { type: Number, default: undefined },
    ptrs: { type: [String], default: undefined },
    uncertain: { type: Boolean, default: undefined },
  },
  { _id: false }
);

const uploadDocumentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    sub: { type: String, default: '' },
    body: { type: String, required: true },
  },
  { _id: false }
);

const chartUploadSchema = new mongoose.Schema(
  {
    dept: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    record: { type: String, required: true },
    answerKey: { type: [uploadAnswerSchema], default: [] },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'moderate' },
    patient: {
      name: { type: String, default: 'Uploaded Record' },
      sex: { type: String, enum: ['M', 'F'], default: 'F' },
      age: { type: Number, min: 0, default: 45 },
    },
    // Encounter (copied into Chart on publish; same meaning as there). New uploads must set it.
    encounterType: { type: String, enum: ENCOUNTER_TYPE_LIST, default: undefined },
    billingType: { type: String, enum: BILLING_TYPE_LIST, default: undefined },
    // Work queue (copied into Chart on publish; same meaning as there).
    workType: { type: String, enum: WORK_TYPE_LIST, default: WORK_TYPES.CODE },
    documents: { type: [uploadDocumentSchema], default: undefined },
    encounter: { type: Mixed, default: undefined },
    original: { type: Mixed, default: undefined },
    denial: { type: Mixed, default: undefined },
    previousRecords: { type: Mixed, default: undefined },
    keyMeta: { type: Mixed, default: undefined },
    cdiResponse: { type: String, default: undefined },
    sourceName: { type: String, default: null }, // original file name, for the list
    // The original file in S3 (POST /media-upload); url is built from the key on read.
    sourceFile: {
      type: new mongoose.Schema(
        { key: { type: String, required: true }, size: Number, mimeType: String },
        { _id: false }
      ),
      default: undefined,
    },
    status: { type: String, enum: Object.values(UPLOAD_STATUS), default: UPLOAD_STATUS.DRAFT },
    chart: { type: String, ref: 'Chart', default: null }, // the published Chart's ID
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

chartUploadSchema.index({ status: 1, createdAt: -1 });
chartUploadSchema.plugin(toJSON);

module.exports = mongoose.model('ChartUpload', chartUploadSchema);
module.exports.UPLOAD_STATUS = UPLOAD_STATUS;
