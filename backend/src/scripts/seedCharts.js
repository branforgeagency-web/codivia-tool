// Seeds every built-in chart from Frontend/public/data/charts/*.js into MongoDB,
// then reads them all back and checks each one field by field against the source.
// Safe to re-run: charts are upserted by ID, so nothing is duplicated.
//
// Usage:
//   npm run seed:charts                         all 22 files
//   npm run seed:charts -- --dept=CARDIO        one file
//   npm run seed:charts -- --dept=CARDIO,GI     several files
//   npm run seed:charts -- --dir=<charts-dir>   a different source folder
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Chart } = require('../models');

const DEFAULT_DIR = path.resolve(__dirname, '../../../Frontend/public/data/charts');
const BATCH = 500;

// The source files are browser scripts that fill window.CHART_DATA; run them in a sandbox.
const loadSource = (dir, depts) => {
  let files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  if (depts) {
    const missing = depts.filter((d) => !files.includes(`${d}.js`));
    if (missing.length) throw new Error(`No chart file for: ${missing.join(', ')}`);
    files = files.filter((f) => depts.includes(path.basename(f, '.js')));
  }
  if (!files.length) throw new Error(`No chart files found in ${dir}`);
  const ctx = { window: {} };
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return { files, data: ctx.window.CHART_DATA || {} };
};

// The exact document we expect in Mongo for a source chart.
const toDoc = (c, dept, index) => ({
  _id: c.id,
  dept,
  deptName: c.deptName,
  position: index + 1,
  difficulty: c.difficulty,
  title: c.title,
  patient: { name: c.patient.name, sex: c.patient.sex, age: c.patient.age },
  record: c.record,
  answerKey: c.answerKey.map(({ code, desc, type, why }) => ({ code, desc, type, why })),
  handwritten: c.handwritten === true,
  source: 'builtin',
});

const checkSource = (data) => {
  const ids = new Set();
  const known = ['id', 'dept', 'deptName', 'difficulty', 'title', 'patient', 'record', 'answerKey', 'handwritten'];
  Object.entries(data).forEach(([dept, arr]) => {
    arr.forEach((c) => {
      if (ids.has(c.id)) throw new Error(`Duplicate chart ID in source: ${c.id}`);
      ids.add(c.id);
      if (c.dept !== dept) throw new Error(`${c.id}: dept "${c.dept}" is in the ${dept} file`);
      const extra = Object.keys(c).filter((k) => !known.includes(k));
      if (extra.length) throw new Error(`${c.id}: unknown field(s) ${extra.join(', ')} would be lost`);
    });
  });
  return ids.size;
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const verify = async (expected) => {
  const problems = [];
  for (let i = 0; i < expected.length; i += BATCH) {
    const chunk = expected.slice(i, i + BATCH);
    const docs = await Chart.find({ _id: { $in: chunk.map((d) => d._id) } }).lean();
    const byId = new Map(docs.map((d) => [d._id, d]));
    chunk.forEach((exp) => {
      const got = byId.get(exp._id);
      if (!got) return problems.push(`${exp._id}: missing`);
      const actual = toDoc({ ...got, id: got._id }, got.dept, got.position - 1);
      if (!same(actual, exp)) problems.push(`${exp._id}: differs from source`);
    });
  }
  return problems;
};

const seedCharts = async ({ dir = DEFAULT_DIR, depts = null } = {}) => {
  const { files, data } = loadSource(dir, depts);
  const total = checkSource(data);
  console.log(`Source: ${files.join(', ')} (${total} charts)`);

  const expected = Object.entries(data).flatMap(([dept, arr]) => arr.map((c, i) => toDoc(c, dept, i)));

  // Validate against the schema before writing anything.
  for (const doc of expected) {
    await new Chart(doc).validate().catch((err) => {
      throw new Error(`${doc._id}: ${err.message}`);
    });
  }

  let upserted = 0;
  let modified = 0;
  for (let i = 0; i < expected.length; i += BATCH) {
    const ops = expected.slice(i, i + BATCH).map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    }));
    const res = await Chart.bulkWrite(ops, { ordered: false, timestamps: true });
    upserted += res.upsertedCount;
    modified += res.modifiedCount;
  }
  console.log(`Written: ${upserted} new, ${modified} existing refreshed`);

  // Read everything back and compare.
  const problems = await verify(expected);
  const counts = await Chart.aggregate([{ $match: { source: 'builtin' } }, { $group: { _id: '$dept', n: { $sum: 1 } } }]);
  const dbCounts = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  Object.entries(data).forEach(([dept, arr]) => {
    const n = dbCounts[dept] || 0;
    console.log(`  ${dept.padEnd(8)} source ${String(arr.length).padStart(4)}  db ${String(n).padStart(4)}`);
    if (n !== arr.length) problems.push(`${dept}: source has ${arr.length}, db has ${n}`);
  });
  if (!depts) {
    Object.keys(dbCounts)
      .filter((d) => !data[d])
      .forEach((d) => problems.push(`${d}: ${dbCounts[d]} built-in charts in db but no source file`));
  }

  if (problems.length) {
    problems.slice(0, 20).forEach((p) => console.error(`  ✗ ${p}`));
    throw new Error(`Verification failed: ${problems.length} problem(s)`);
  }
  console.log(`Verified: all ${total} charts match the source exactly`);
  return total;
};

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await Chart.syncIndexes();
    const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
    const dept = arg('dept');
    await seedCharts({
      dir: arg('dir') ? path.resolve(arg('dir')) : DEFAULT_DIR,
      depts: dept ? dept.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean) : null,
    });
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedCharts };
