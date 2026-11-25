const mongoose = require('mongoose');
const { FEE_KIND_LIST } = require('../config/fees');
const { toJSON } = require('./plugins');

// One CMS PFS Relative Value File release (a folder such as RVU26C), loaded by `npm run seed:fees`.
// Exactly one release is `active`: the one the app prices codes from. The rows of each file live in
// their own collections (feervus, feegpcis, feelocalities, feeanesthesia, feeoppscaps), tagged with
// this release's _id.
const fileSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: FEE_KIND_LIST, required: true },
    file: { type: String, required: true }, // path under the data folder, e.g. "RVU26C/GPCI2026.csv"
    rows: { type: Number, required: true, min: 0 },
    copiedFrom: { type: String }, // release the file was taken from when this release has none
  },
  { _id: false }
);

const feeReleaseSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // "RVU26C"
    year: { type: Number, required: true }, // 2026
    letter: { type: String, required: true, match: /^[A-Z]$/ }, // "C"
    title: { type: String, default: '' }, // "2026 National Physician Fee Schedule Relative Value File July Release"
    releasedOn: { type: String, default: '' }, // "06/30/2026", as printed by CMS
    conversionFactor: {
      nonQpp: { type: Number, required: true }, // dollars per RVU (the usual conversion factor)
      qpp: { type: Number }, // qualifying APM participants
    },
    anesthesiaConversionFactor: { nonQpp: { type: Number }, qpp: { type: Number } }, // national
    files: { type: [fileSchema], default: [] },
    missing: { type: [String], default: [] }, // kinds not found for this release
    active: { type: Boolean, default: false },
    loadedAt: { type: Date, required: true },
  },
  { versionKey: false, collection: 'feereleases' }
);

feeReleaseSchema.index({ year: 1, letter: 1 }, { unique: true });
feeReleaseSchema.index({ active: 1 });
feeReleaseSchema.plugin(toJSON);

module.exports = mongoose.model('FeeRelease', feeReleaseSchema);
