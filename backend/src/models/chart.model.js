const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const DIFFICULTIES = ['beginner', 'moderate', 'advanced'];
const SOURCES = ['builtin', 'upload'];

const answerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    desc: { type: String, required: true },
    type: { type: String, required: true }, // PDx, SDx, Dx, CPT, HCPCS, MOD, PCS, PDGM
    why: { type: String, required: true },
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
  },
  { timestamps: true }
);

chartSchema.index({ dept: 1, position: 1 }, { unique: true });
chartSchema.plugin(toJSON);

module.exports = mongoose.model('Chart', chartSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
