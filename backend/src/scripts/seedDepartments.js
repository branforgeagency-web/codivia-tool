// Seeds the departments collection from src/data/departments.data.js, then checks the result.
//
// Usage:
//   npm run seed:departments              add missing departments; existing ones are left as they are
//   npm run seed:departments -- --reset   also overwrite existing departments with the seed data
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Department, Chart } = require('../models');
const SEED = require('../data/departments.data');

const FIELDS = ['name', 'icon', 'group', 'elements', 'order'];
const pick = (d) => Object.fromEntries(FIELDS.map((f) => [f, d[f]]));
const same = (a, b) => JSON.stringify(pick(a)) === JSON.stringify(pick(b));

const seedDepartments = async ({ reset = false } = {}) => {
  const keys = SEED.map((d) => d.key);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate department key in seed data');

  // Validate everything before writing anything.
  for (const { key, ...d } of SEED) {
    await new Department({ _id: key, ...d }).validate().catch((err) => {
      throw new Error(`${key}: ${err.message}`);
    });
  }

  const ops = SEED.map(({ key, ...d }) =>
    reset
      ? { updateOne: { filter: { _id: key }, update: { $set: { ...d, isActive: true } }, upsert: true } }
      : { updateOne: { filter: { _id: key }, update: { $setOnInsert: { ...d, isActive: true } }, upsert: true } }
  );
  const res = await Department.bulkWrite(ops, { ordered: false });
  console.log(`Seed: ${SEED.length} departments → ${res.upsertedCount} added, ${res.modifiedCount} overwritten`);

  // Check: every seed department exists; report any that differ from the seed (edited by an admin).
  const docs = await Department.find({ _id: { $in: keys } }).lean();
  const byKey = new Map(docs.map((d) => [d._id, d]));
  const missing = keys.filter((k) => !byKey.has(k));
  if (missing.length) throw new Error(`Missing after seeding: ${missing.join(', ')}`);
  const differ = SEED.filter((s) => !same(byKey.get(s.key), s)).map((s) => s.key);
  if (differ.length) {
    if (reset) throw new Error(`Differ from seed after reset: ${differ.join(', ')}`);
    console.log(`Kept existing (differ from seed, use --reset to overwrite): ${differ.join(', ')}`);
  }

  // Cross-check with the charts collection.
  const counts = await Chart.aggregate([{ $group: { _id: '$dept', n: { $sum: 1 } } }]);
  const chartCount = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const total = await Department.countDocuments();
  const orphanDepts = Object.keys(chartCount).filter((k) => !byKey.has(k));
  const empty = keys.filter((k) => !chartCount[k]);
  console.log(`Departments in DB: ${total} (${keys.length - empty.length} with charts, ${empty.length} without)`);
  if (empty.length) console.log(`  No charts yet: ${empty.join(', ')}`);
  if (orphanDepts.length) throw new Error(`Charts exist for departments not in the collection: ${orphanDepts.join(', ')}`);
  console.log('Verified: all seed departments are in the database and every chart has a department');
};

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await Department.syncIndexes();
    await seedDepartments({ reset: process.argv.includes('--reset') });
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedDepartments };
