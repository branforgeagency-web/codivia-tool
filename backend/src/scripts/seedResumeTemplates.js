// Seeds the resume_templates collection from the retained frontend template definitions.
// Usage: npm run seed:resume-templates [-- --reset]
const path = require('path');
const { pathToFileURL } = require('url');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { ResumeTemplate } = require('../models');

const SOURCE = path.resolve(__dirname, '../../../Frontend/src/pages/student/resume/templates.js');

const readSource = async () => {
  const { RESUME_TEMPLATES, RESUME_LAYOUTS } = await import(pathToFileURL(SOURCE).href);
  const layouts = new Map(RESUME_LAYOUTS.map((layout) => [layout.key, layout]));
  const templates = RESUME_TEMPLATES.map((template, order) => {
    const layout = layouts.get(template.layout);
    if (!layout) throw new Error(`${template.id}: layout is missing from the source`);
    return {
      _id: template.id,
      name: template.name,
      layout: template.layout,
      layoutName: layout.name,
      layoutDesc: layout.desc,
      pal: {
        key: template.pal.key,
        name: template.pal.name,
        accent: template.pal.accent,
        deep: template.pal.deep,
        tint: template.pal.tint,
        ink: template.pal.ink,
      },
      fam: template.fam,
      order,
      isActive: true,
    };
  });
  const ids = templates.map((template) => template._id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate resume template IDs in source');
  return templates;
};

const seedResumeTemplates = async ({ reset = false } = {}) => {
  const templates = await readSource();
  for (const template of templates) {
    await new ResumeTemplate(template).validate().catch((err) => {
      throw new Error(`${template._id}: ${err.message}`);
    });
  }

  const ops = templates.map(({ _id, ...template }) =>
    reset
      ? { updateOne: { filter: { _id }, update: { $set: template }, upsert: true } }
      : { updateOne: { filter: { _id }, update: { $setOnInsert: template }, upsert: true } }
  );
  const result = await ResumeTemplate.bulkWrite(ops, { ordered: false });
  console.log(
    `Seed: ${templates.length} resume templates → ${result.upsertedCount} added, ${result.modifiedCount} updated`
  );

  const stored = await ResumeTemplate.find({ _id: { $in: templates.map(({ _id }) => _id) } }).lean();
  const storedIds = new Set(stored.map(({ _id }) => _id));
  const missing = templates.map(({ _id }) => _id).filter((id) => !storedIds.has(id));
  if (missing.length) throw new Error(`Missing after seeding: ${missing.join(', ')}`);
  if (reset) {
    const inactive = stored.filter((template) => !template.isActive).map(({ _id }) => _id);
    if (inactive.length) throw new Error(`Inactive after reset: ${inactive.join(', ')}`);
  }
  console.log(`Verified: ${stored.length} resume templates in resume_templates`);
};

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await ResumeTemplate.createIndexes();
    await seedResumeTemplates({ reset: process.argv.includes('--reset') });
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedResumeTemplates, readSource };
