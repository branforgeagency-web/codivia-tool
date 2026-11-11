const mongoose = require('mongoose');
const { CODE_SYSTEM_KEYS } = require('../config/codes');
const { toJSON } = require('./plugins');

// One billable code from ICD-10-CM, ICD-10-PCS, CPT or HCPCS.
// _id is "<system>:<code>" (e.g. "ICD10CM:A000"): the same code can exist in two systems
// (A0100 is both an ICD-10-CM and a HCPCS code). `seq` keeps the source order, which the
// search uses to break ties, so results come back in the same order as the old in-browser search.
// Values are stored exactly as in the source: no trimming or case changes.
const codeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    system: { type: String, enum: CODE_SYSTEM_KEYS, required: true },
    code: { type: String, required: true }, // without dots, e.g. A000
    display: { type: String, required: true }, // as printed, e.g. A00.0
    description: { type: String, required: true },
    billable: { type: Boolean, required: true },
    seq: { type: Number, required: true, min: 0, private: true }, // internal: tie-break order
  },
  { versionKey: false }
);

codeSchema.index({ system: 1, code: 1 }, { unique: true });
codeSchema.index({ code: 1 }); // code-prefix search and validation
codeSchema.index({ display: 1 });
codeSchema.index({ seq: 1 }, { unique: true });
codeSchema.plugin(toJSON);

module.exports = mongoose.model('Code', codeSchema);
