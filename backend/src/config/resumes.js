// Resume Builder: saved resumes. The content fields mirror the frontend's resume object
// (pages/student/resume/templates.js defaultResume), so the builder can save and load it as is.

// Layouts and colour palettes the builder offers. A template id is "<layout>-<palette>".
const RESUME_LAYOUTS = Object.freeze([
  'header-band',
  'left-rail',
  'right-rail',
  'top-banner',
  'minimal',
  'timeline',
  'compact',
  'classic',
  'executive',
  'split-header',
  'soft-sidebar',
  'modern-cards',
]);
const RESUME_PALETTES = Object.freeze(['teal', 'navy', 'gold', 'coral', 'forest']);
const RESUME_TEMPLATES = Object.freeze(RESUME_LAYOUTS.flatMap((l) => RESUME_PALETTES.map((p) => `${l}-${p}`)));
const DEFAULT_RESUME_TEMPLATE = 'header-band-teal';

const RESUME_LIMITS = Object.freeze({
  perUser: 20, // saved resumes per user
  title: 100,
  short: 150, // name, role, phone, email, location, list item titles ...
  url: 300,
  summary: 2000,
  text: 1000, // a bullet / project line
  photo: 700 * 1024, // data URL length (~500 KB image); the builder shrinks photos before saving
  highlights: 3,
  items: 20, // entries per list (experience, education ...)
  bullets: 20,
  tags: 40, // entries per skill list
  tag: 100,
});

const RESUME_SORT_FIELDS = Object.freeze(['updatedAt', 'createdAt', 'title']);

// Every content field, for building full (PUT) and partial (PATCH) updates.
const RESUME_CONTENT_FIELDS = Object.freeze([
  'name',
  'role',
  'phone',
  'email',
  'location',
  'linkedin',
  'photo',
  'summary',
  'stats3',
  'experience',
  'certifications',
  'education',
  'projects',
  'coreSkills',
  'clinical',
  'tools',
  'strengths',
  'languages',
]);

module.exports = {
  RESUME_LAYOUTS,
  RESUME_PALETTES,
  RESUME_TEMPLATES,
  DEFAULT_RESUME_TEMPLATE,
  RESUME_LIMITS,
  RESUME_SORT_FIELDS,
  RESUME_CONTENT_FIELDS,
};
