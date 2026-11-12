const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const paletteSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    accent: { type: String, required: true, trim: true },
    deep: { type: String, required: true, trim: true },
    tint: { type: String, required: true, trim: true },
    ink: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const resumeTemplateSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    layout: { type: String, required: true, trim: true },
    layoutName: { type: String, required: true, trim: true },
    layoutDesc: { type: String, required: true, trim: true },
    pal: { type: paletteSchema, required: true },
    fam: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'resume_templates' }
);

resumeTemplateSchema.index({ isActive: 1, order: 1 });
resumeTemplateSchema.plugin(toJSON);

module.exports = mongoose.model('ResumeTemplate', resumeTemplateSchema);
