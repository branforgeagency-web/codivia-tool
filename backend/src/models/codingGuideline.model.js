const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const codingGuidelineSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    sub: { type: String, default: '' },
    color: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 0 },
    chapters: { type: [mongoose.Schema.Types.Mixed], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'coding_guidelines' }
);

codingGuidelineSchema.index({ isActive: 1, order: 1 });
codingGuidelineSchema.plugin(toJSON);

module.exports = mongoose.model('CodingGuideline', codingGuidelineSchema);
