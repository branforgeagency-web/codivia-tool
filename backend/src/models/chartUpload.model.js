const mongoose = require('mongoose');
const { DIFFICULTIES } = require('./chart.model');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

const UPLOAD_STATUS = Object.freeze({ DRAFT: 'draft', PUBLISHED: 'published' });

// A chart an admin uploaded on the Upload page. Drafts live only here, so they never reach the chart
// pool, allocations or students. Publishing copies it into Chart (source: 'upload') as `chart`;
// moving it back to draft removes that Chart.
// Drafts may be incomplete (empty desc / why), so the answer key is checked only when publishing.
const uploadAnswerSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, default: '' },
    type: { type: String, trim: true, default: '' },
    desc: { type: String, default: '' },
    why: { type: String, default: '' },
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
    sourceName: { type: String, default: null }, // original file name, for the list
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
