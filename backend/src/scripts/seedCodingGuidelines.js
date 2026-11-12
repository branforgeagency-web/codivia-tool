// Seeds the coding_guidelines collection from the retained public coding-guide.js file.
// Re-running refreshes the seeded code sets without deleting other records.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isDeepStrictEqual } = require('util');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { CodingGuideline } = require('../models');

const SOURCE = path.resolve(__dirname, '../../../Frontend/public/data/coding-guide.js');

const readSource = () => {
  const context = vm.createContext({});
  const script = `${fs.readFileSync(SOURCE, 'utf8')}\nCODING_GUIDE`;
  const source = vm.runInContext(script, context, { filename: SOURCE });
  return JSON.parse(JSON.stringify(source));
};

const toDocuments = (source) =>
  Object.entries(source).map(([key, guideline], order) => {
    if (!guideline.label || !Array.isArray(guideline.chapters)) {
      throw new Error(`${key}: expected a label and chapters array`);
    }
    return {
      _id: key,
      label: guideline.label,
      sub: guideline.sub || '',
      color: guideline.color,
      order,
      chapters: guideline.chapters,
      isActive: true,
    };
  });

const seedCodingGuidelines = async () => {
  const expected = toDocuments(readSource());
  if (!expected.length) throw new Error('No coding guidelines found in the source');

  for (const doc of expected) {
    await new CodingGuideline(doc).validate().catch((err) => {
      throw new Error(`${doc._id}: ${err.message}`);
    });
  }

  const ops = expected.map((doc) => ({
    replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
  }));
  const result = await CodingGuideline.bulkWrite(ops, { ordered: false });
  console.log(
    `Seed: ${expected.length} coding guidelines → ${result.upsertedCount} added, ${result.modifiedCount} updated`
  );

  const actual = await CodingGuideline.find({ _id: { $in: expected.map(({ _id }) => _id) } })
    .select('_id label sub color order chapters isActive')
    .lean();
  const byId = new Map(actual.map((doc) => [doc._id, doc]));
  const invalid = expected.filter((doc) => {
    const stored = byId.get(doc._id);
    return (
      !stored ||
      !isDeepStrictEqual(
        {
          _id: stored._id,
          label: stored.label,
          sub: stored.sub,
          color: stored.color,
          order: stored.order,
          chapters: stored.chapters,
          isActive: stored.isActive,
        },
        doc
      )
    );
  });
  if (invalid.length) throw new Error(`Guideline verification failed: ${invalid.map((d) => d._id).join(', ')}`);
  console.log(`Verified: all ${actual.length} code sets match the source`);
};

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await CodingGuideline.createIndexes();
    await seedCodingGuidelines();
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedCodingGuidelines, readSource };
