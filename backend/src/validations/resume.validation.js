const Joi = require('joi');
const { RESUME_TEMPLATES, RESUME_LIMITS: L, RESUME_SORT_FIELDS } = require('../config/resumes');
const { objectId } = require('./custom.validation');

const id = Joi.string().custom(objectId);
const str = (max) => Joi.string().trim().max(max).allow('');
const strList = (max, count) => Joi.array().items(str(max)).max(count);

// Content fields, same names and shapes as the builder's resume object.
const content = {
  name: str(L.short),
  role: str(L.short),
  phone: str(L.short),
  email: Joi.string().trim().lowercase().email().max(L.short).allow(''),
  location: str(L.short),
  linkedin: str(L.url),
  photo: Joi.string()
    .max(L.photo)
    .pattern(/^data:image\/(png|jpe?g|webp|gif);base64,/)
    .allow('')
    .messages({ 'string.pattern.base': 'photo must be a PNG, JPEG, WebP or GIF image', 'string.max': 'photo is too large' }),
  summary: str(L.summary),
  stats3: Joi.array().items(Joi.object({ big: str(L.short), small: str(L.short) })).max(L.highlights),
  experience: Joi.array()
    .items(Joi.object({ role: str(L.short), period: str(L.short), bullets: strList(L.text, L.bullets) }))
    .max(L.items),
  certifications: Joi.array()
    .items(Joi.object({ name: str(L.short), by: str(L.short), id: str(L.short), valid: str(L.short) }))
    .max(L.items),
  education: Joi.array()
    .items(Joi.object({ degree: str(L.short), school: str(L.short), period: str(L.short), detail: str(L.short) }))
    .max(L.items),
  projects: strList(L.text, L.items),
  coreSkills: strList(L.tag, L.tags),
  clinical: strList(L.tag, L.tags),
  tools: strList(L.tag, L.tags),
  strengths: strList(L.tag, L.tags),
  languages: strList(L.tag, L.tags),
};

const meta = {
  title: Joi.string().trim().min(1).max(L.title),
  template: Joi.string().valid(...RESUME_TEMPLATES),
};

const resumeIdParam = Joi.object({ resumeId: id.required() });

const createResume = { body: Joi.object({ ...meta, ...content }) };

const getResumes = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow(''),
    owner: id, // admins only: one user's resumes
    sortBy: Joi.string().valid(...RESUME_SORT_FIELDS).default('updatedAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const getResume = { params: resumeIdParam };

// PUT replaces the whole resume: fields left out go back to their defaults.
const replaceResume = { params: resumeIdParam, body: Joi.object({ ...meta, ...content }) };

// PATCH changes only the fields sent.
const updateResume = { params: resumeIdParam, body: Joi.object({ ...meta, ...content }).min(1) };

const deleteResume = { params: resumeIdParam };

module.exports = { createResume, getResumes, getResume, replaceResume, updateResume, deleteResume };
