// Resume Builder: saved resumes. The content fields mirror the frontend's resume object
// (pages/student/resume/templates.js defaultResume), so the builder can save and load it as is.

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
  'customColor',
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
  DEFAULT_RESUME_TEMPLATE,
  RESUME_LIMITS,
  RESUME_SORT_FIELDS,
  RESUME_CONTENT_FIELDS,
};
