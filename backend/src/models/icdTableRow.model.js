const mongoose = require('mongoose');
const { ALL_ICD_TABLES } = require('../config/codes');
const { toJSON } = require('./plugins');

// One row of the Neoplasm Table or the Table of Drugs and Chemicals.
//   t = term, l = indent level, c = one code per column ('' where the book has none)
// The tables are indented lists, so `seq` (source order) matters; `path` holds the terms of the
// rows above this one that it is indented under, e.g. ["abdomen, abdominal"] for "cavity".
const icdTableRowSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. NEO-0001
    table: { type: String, enum: ALL_ICD_TABLES, required: true },
    seq: { type: Number, required: true, min: 0 },
    t: { type: String, required: true },
    l: { type: Number, required: true, min: 0 },
    c: { type: [String], required: true },
    path: { type: [String], default: [] },
  },
  { versionKey: false }
);

icdTableRowSchema.index({ table: 1, seq: 1 }, { unique: true });
icdTableRowSchema.plugin(toJSON);

module.exports = mongoose.model('IcdTableRow', icdTableRowSchema);
