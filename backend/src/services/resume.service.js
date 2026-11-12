const { Resume, ResumeTemplate } = require('../models');
const { MANAGER_ROLES } = require('../config/roles');
const { RESUME_LIMITS, RESUME_CONTENT_FIELDS, DEFAULT_RESUME_TEMPLATE } = require('../config/resumes');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');

const LIVE = { deletedAt: null };
const isManager = (actor) => MANAGER_ROLES.includes(actor.role);

// Users only reach their own resumes; managers reach everyone's.
// Someone else's resume answers 404, so its existence isn't revealed.
const scope = (actor) => (isManager(actor) ? { ...LIVE } : { ...LIVE, owner: actor._id });

const findResume = async (id, actor) => {
  const resume = await Resume.findOne({ _id: id, ...scope(actor) });
  if (!resume) throw new ApiError(httpStatus.NOT_FOUND, 'Resume not found');
  return resume;
};

const assertTemplateExists = async (templateId) => {
  const found = await ResumeTemplate.exists({ _id: templateId, isActive: true });
  if (!found) throw new ApiError(httpStatus.BAD_REQUEST, `Unknown or inactive resume template: ${templateId}`);
};

const queryResumeTemplates = () => ResumeTemplate.find({ isActive: true }).sort({ order: 1, _id: 1 });

// Values a field takes when a PUT leaves it out.
const BLANK = Object.freeze({
  title: 'My resume',
  template: DEFAULT_RESUME_TEMPLATE,
  ...Object.fromEntries(
    RESUME_CONTENT_FIELDS.map((f) => [
      f,
      ['stats3', 'experience', 'certifications', 'education', 'projects', 'coreSkills', 'clinical', 'tools', 'strengths', 'languages'].includes(f)
        ? []
        : '',
    ])
  ),
});

const createResume = async (body, actor) => {
  await assertTemplateExists(body.template || DEFAULT_RESUME_TEMPLATE);
  const count = await Resume.countDocuments({ owner: actor._id, ...LIVE });
  if (count >= RESUME_LIMITS.perUser) {
    throw new ApiError(httpStatus.CONFLICT, `You can save up to ${RESUME_LIMITS.perUser} resumes. Delete one to add another.`);
  }
  return Resume.create({ ...body, owner: actor._id });
};

const queryResumes = async ({ search, owner, sortBy = 'updatedAt', order = 'desc', page = 1, limit = 10 }, actor) => {
  const filter = scope(actor);
  if (owner && isManager(actor)) filter.owner = owner;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { name: pattern }, { role: pattern }];
  }
  const [results, totalResults] = await Promise.all([
    // The photo can be hundreds of KB, so lists leave it out; GET /:resumeId returns it.
    Resume.find(filter)
      .select('-photo')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Resume.countDocuments(filter),
  ]);
  return { results, page, limit, totalPages: Math.max(1, Math.ceil(totalResults / limit)), totalResults };
};

const getResume = (id, actor) => findResume(id, actor);

// PUT: the body is the whole resume; anything left out is reset.
const replaceResume = async (id, body, actor) => {
  await assertTemplateExists(body.template || DEFAULT_RESUME_TEMPLATE);
  const resume = await findResume(id, actor);
  resume.set({ ...BLANK, ...body });
  return resume.save();
};

// PATCH: only the fields sent change.
const updateResume = async (id, updates, actor) => {
  if (updates.template) await assertTemplateExists(updates.template);
  const resume = await findResume(id, actor);
  resume.set(updates);
  return resume.save();
};

// Soft delete.
const deleteResume = async (id, actor) => {
  const resume = await findResume(id, actor);
  resume.deletedAt = new Date();
  await resume.save();
};

module.exports = {
  queryResumeTemplates,
  createResume,
  queryResumes,
  getResume,
  replaceResume,
  updateResume,
  deleteResume,
};
