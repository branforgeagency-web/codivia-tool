const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Chart, ChartUpload, Department } = require('../models');
const { BILLING_TYPES, ENCOUNTER_TYPES } = require('../config/encounter');

// Backfill for charts created before charts had an encounter type (OP / IP).
//
// Nothing needs to run for the app to work: a chart without encounterType keeps the behaviour it was
// graded under (inpatient facility when its department codes ICD-10-PCS / MS-DRG, else outpatient).
// This script only writes a value where that behaviour is unambiguous, so no chart is given an
// encounter type it wasn't already being coded as:
//   - department codes ICD-10-PCS or MS-DRG and no CPT / HCPCS / E/M  -> IP, facility
//   - department codes none of ICD-10-PCS / MS-DRG                   -> OP
//   - department codes both (mixed)                                  -> left unset, listed for review
//
// Dry run by default (prints what it would do). Pass --apply to write.
//   npm run migrate:encounter-types            (report)
//   npm run migrate:encounter-types -- --apply (write)

const INPATIENT = ['ICD10PCS', 'DRG'];
const OUTPATIENT = ['CPT', 'HCPCS', 'EM'];

const inferFor = (elements = []) => {
  const ip = elements.some((e) => INPATIENT.includes(e));
  const op = elements.some((e) => OUTPATIENT.includes(e));
  if (ip && !op) return { encounterType: ENCOUNTER_TYPES.IP, billingType: BILLING_TYPES.FACILITY };
  if (!ip) return { encounterType: ENCOUNTER_TYPES.OP };
  return null; // mixed: an admin decides per chart (Browse Charts → Edit)
};

const migrate = async ({ apply = false } = {}) => {
  const departments = await Department.find().select('name elements').lean();
  const missing = { encounterType: { $exists: false } };
  const report = { set: 0, review: [] };

  for (const d of departments) {
    const inferred = inferFor(d.elements);
    const [charts, uploads] = await Promise.all([
      Chart.countDocuments({ dept: d._id, ...missing }),
      ChartUpload.countDocuments({ dept: d._id, ...missing }),
    ]);
    if (!charts && !uploads) continue;
    if (!inferred) {
      report.review.push(`${d._id} (${d.name}): ${charts} chart(s), ${uploads} upload(s) — department codes both inpatient and outpatient sets`);
      continue;
    }
    const label = inferred.encounterType + (inferred.billingType ? ` / ${inferred.billingType}` : '');
    console.log(`${apply ? 'Setting' : 'Would set'} ${label} on ${charts} chart(s) and ${uploads} upload(s) in ${d._id} (${d.name})`);
    if (apply) {
      await Chart.updateMany({ dept: d._id, ...missing }, { $set: inferred });
      await ChartUpload.updateMany({ dept: d._id, ...missing }, { $set: inferred });
    }
    report.set += charts + uploads;
  }
  if (report.review.length) {
    console.log('\nLeft unset — set the encounter type per chart in Browse Charts → Edit:');
    report.review.forEach((r) => console.log('  ' + r));
  }
  if (!apply) console.log('\nDry run: nothing was written. Run again with --apply to write.');
  return report;
};

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await migrate({ apply: process.argv.includes('--apply') });
  } catch (err) {
    console.error(`Migration failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { migrate, inferFor };
