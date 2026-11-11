const mongoose = require('mongoose');
const { ALL_ICD_INDEXES } = require('../config/codes');
const { toJSON } = require('./plugins');

// One main term of the ICD-10-CM Alphabetic Index or the Index to External Causes, with its
// whole sub-term tree. Field names are the source's, so the frontend renderer works unchanged:
//   t = term, c = code, s = "see", sa = "see also", d = sub-terms (same shape, nested up to ~10 levels)
// `norm` is the term lowercased without parenthetical modifiers, used for searching.
const icdIndexTermSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. MAIN-00042
    index: { type: String, enum: ALL_ICD_INDEXES, required: true },
    seq: { type: Number, required: true, min: 0 },
    norm: { type: String, required: true },
    t: { type: String, required: true },
    c: String,
    s: String,
    sa: String,
    d: mongoose.Schema.Types.Mixed,
  },
  { versionKey: false, minimize: false }
);

icdIndexTermSchema.index({ index: 1, seq: 1 }, { unique: true });
icdIndexTermSchema.index({ index: 1, norm: 1 });
icdIndexTermSchema.plugin(toJSON);

module.exports = mongoose.model('IcdIndexTerm', icdIndexTermSchema);
