const mongoose = require('mongoose');
const { DEFAULT_RESUME_TEMPLATE, RESUME_LIMITS: L } = require('../config/resumes');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

const text = (maxlength) => ({ type: String, trim: true, maxlength, default: '' });
const list = (maxlength) => ({ type: [{ type: String, trim: true, maxlength }], default: [] });

// List entries keep exactly the frontend's field names. `_id: false` and `id: false` because
// certifications have their own `id` field (the credential ID).
const sub = (fields) => new mongoose.Schema(fields, { _id: false, id: false });

const highlightSchema = sub({ big: text(L.short), small: text(L.short) });
const experienceSchema = sub({ role: text(L.short), period: text(L.short), bullets: list(L.text) });
const certificationSchema = sub({ name: text(L.short), by: text(L.short), id: text(L.short), valid: text(L.short) });
const educationSchema = sub({ degree: text(L.short), school: text(L.short), period: text(L.short), detail: text(L.short) });

// One saved resume. Users only ever see their own (the service filters by `owner`); admins see all.
const resumeSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: L.title, default: 'My resume' },
    template: { type: String, required: true, default: DEFAULT_RESUME_TEMPLATE },

    // ---- content (same shape as the builder's resume object) ----
    name: text(L.short),
    role: text(L.short),
    phone: text(L.short),
    email: text(L.short),
    location: text(L.short),
    linkedin: text(L.url),
    photo: { type: String, maxlength: L.photo, default: '' }, // data URL
    customColor: text(7),
    summary: text(L.summary),
    stats3: { type: [highlightSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    projects: list(L.text),
    coreSkills: list(L.tag),
    clinical: list(L.tag),
    tools: list(L.tag),
    strengths: list(L.tag),
    languages: list(L.tag),

    // Soft delete: hidden from every query.
    deletedAt: { type: Date, default: null, private: true },
  },
  { timestamps: true }
);

resumeSchema.index({ owner: 1, deletedAt: 1, updatedAt: -1 });
resumeSchema.plugin(toJSON);

module.exports = mongoose.model('Resume', resumeSchema);
