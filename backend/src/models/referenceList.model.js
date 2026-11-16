const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const { Mixed } = mongoose.Schema.Types;

// One reference list the coding workspace and admin upload show (dispositions, POA, defer reasons,
// remit codes, MS-DRGs …). _id is the list key, e.g. "dispositions". Seeded by `npm run seed:reference`.
const itemSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    code: { type: String, default: undefined },
    desc: { type: String, default: undefined },
    meta: { type: Mixed, default: undefined },
  },
  { _id: false }
);

const referenceListSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, trim: true },
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true }
);

referenceListSchema.plugin(toJSON);

module.exports = mongoose.model('ReferenceList', referenceListSchema);
