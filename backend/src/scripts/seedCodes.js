// Seeds the Code Search reference data from Frontend/public/data/codes/*.js into MongoDB:
//   code-db.js                     -> codes          (ICD-10-CM, ICD-10-PCS, CPT, HCPCS)
//   icd-index.js / icd-eindex.js   -> icdindexterms  (Alphabetic Index / Index to External Causes)
//   icd-neo.js / icd-drug.js       -> icdtablerows   (Neoplasm Table / Table of Drugs and Chemicals)
//   icd-notes.js                   -> icdnotes       (Tabular List notes)
// Then it reads every collection back, rebuilds the original data from it and checks that it is
// identical to the source, value for value and in the same order. Documents that are no longer in
// the source are deleted, so the database always matches the files exactly.
// Safe to re-run.
//
// Usage:
//   npm run seed:codes                          everything
//   npm run seed:codes -- --only=codes,notes    some datasets (codes, index, tables, notes)
//   npm run seed:codes -- --dir=<codes-dir>     a different source folder
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Code, IcdIndexTerm, IcdTableRow, IcdNote } = require('../models');
const { SYSTEM_BY_LEGACY_INDEX, CODE_SYSTEM_LIST, ICD_INDEXES, ICD_TABLES, ICD_TABLE_COLUMN_COUNT, NOTE_KINDS } =
  require('../config/codes');
const { normalizeTerm } = require('../utils/codeText');

const DEFAULT_DIR = path.resolve(__dirname, '../../../Frontend/public/data/codes');
const BATCH = 1000;
const DATASETS = ['codes', 'index', 'tables', 'notes'];
const NODE_KEYS = ['t', 'c', 's', 'sa', 'd'];

// ---------- source ----------

// The files are browser scripts that set window.<NAME>_B64 to gzipped JSON; run them in a sandbox.
const loadSource = (dir) => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  const ctx = { window: {} };
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  const decode = (name) => {
    const b64 = ctx.window[`${name}_B64`];
    if (!b64) throw new Error(`window.${name}_B64 not found in ${dir}`);
    return JSON.parse(zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'));
  };
  return {
    codes: decode('CODE_DB'),
    index: { [ICD_INDEXES.MAIN]: decode('ICD_INDEX'), [ICD_INDEXES.EXTERNAL]: decode('ICD_EINDEX') },
    tables: { [ICD_TABLES.NEOPLASM]: decode('ICD_NEO'), [ICD_TABLES.DRUG]: decode('ICD_DRUG') },
    notes: decode('ICD_NOTES'),
  };
};

// JSON with object keys sorted, so two values compare equal regardless of key order.
const canonical = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
};

const fail = (msg) => {
  throw new Error(msg);
};

// Refuse anything the schema would not store exactly (unknown fields, wrong types).
const checkCodes = (rows) => {
  const ids = new Set();
  rows.forEach((r, i) => {
    if (!Array.isArray(r) || r.length !== 5) fail(`code row ${i}: expected 5 values`);
    const [sys, code, disp, desc, bill] = r;
    if (!SYSTEM_BY_LEGACY_INDEX[sys]) fail(`code row ${i}: unknown system ${sys}`);
    if (![code, disp, desc].every((s) => typeof s === 'string' && s !== '')) fail(`code row ${i}: empty text`);
    if (bill !== 0 && bill !== 1) fail(`code row ${i}: billable must be 0 or 1, got ${JSON.stringify(bill)}`);
    const id = `${SYSTEM_BY_LEGACY_INDEX[sys]}:${code}`;
    if (ids.has(id)) fail(`duplicate code ${id}`);
    ids.add(id);
  });
};

const checkNode = (n, where) => {
  const extra = Object.keys(n).filter((k) => !NODE_KEYS.includes(k));
  if (extra.length) fail(`${where}: unknown field(s) ${extra.join(', ')} would be lost`);
  if (typeof n.t !== 'string' || n.t === '') fail(`${where}: missing term`);
  ['c', 's', 'sa'].forEach((k) => k in n && typeof n[k] !== 'string' && fail(`${where}: ${k} is not text`));
  if ('d' in n) {
    if (!Array.isArray(n.d)) fail(`${where}: d is not a list`);
    n.d.forEach((child, i) => checkNode(child, `${where} > ${i}`));
  }
};

const checkTableRows = (table, rows) => {
  rows.forEach((r, i) => {
    const where = `${table} row ${i}`;
    const extra = Object.keys(r).filter((k) => !['t', 'l', 'c'].includes(k));
    if (extra.length) fail(`${where}: unknown field(s) ${extra.join(', ')} would be lost`);
    if (typeof r.t !== 'string' || r.t === '') fail(`${where}: missing term`);
    if (!Number.isInteger(r.l) || r.l < 0) fail(`${where}: bad level`);
    if (!Array.isArray(r.c) || r.c.length !== ICD_TABLE_COLUMN_COUNT || r.c.some((c) => typeof c !== 'string')) {
      fail(`${where}: expected ${ICD_TABLE_COLUMN_COUNT} code columns`);
    }
  });
};

const checkNotes = (notes) => {
  Object.entries(notes).forEach(([code, n]) => {
    const extra = Object.keys(n).filter((k) => !NOTE_KINDS.includes(k));
    if (extra.length) fail(`notes ${code}: unknown kind(s) ${extra.join(', ')} would be lost`);
    Object.entries(n).forEach(([k, v]) => {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) fail(`notes ${code}.${k}: not a list of text`);
    });
  });
};

// ---------- source -> documents ----------

const pad = (n, width) => String(n).padStart(width, '0');

const codeDocs = (rows) =>
  rows.map(([sys, code, display, description, billable], seq) => ({
    _id: `${SYSTEM_BY_LEGACY_INDEX[sys]}:${code}`,
    system: SYSTEM_BY_LEGACY_INDEX[sys],
    code,
    display,
    description,
    billable: billable === 1,
    seq,
  }));

const indexDocs = (index, terms) =>
  terms.map((n, seq) => ({ _id: `${index.toUpperCase()}-${pad(seq, 5)}`, index, seq, norm: normalizeTerm(n.t), ...n }));

// Terms of the rows above `i` that it is indented under (same walk the frontend did).
const rowPath = (rows, i) => {
  const out = [];
  let lvl = rows[i].l;
  for (let j = i - 1; j >= 0 && lvl > 0; j--) {
    if (rows[j].l < lvl) {
      out.push(rows[j].t);
      lvl = rows[j].l;
    }
  }
  return out.reverse();
};

const tableDocs = (table, rows) =>
  rows.map((r, seq) => ({ _id: `${table.toUpperCase()}-${pad(seq, 4)}`, table, seq, t: r.t, l: r.l, c: r.c, path: rowPath(rows, seq) }));

const noteDocs = (notes) => Object.entries(notes).map(([code, n]) => ({ _id: code, ...n }));

// ---------- documents -> source shape (for verification) ----------

const LEGACY_INDEX = Object.fromEntries(CODE_SYSTEM_LIST.map((s) => [s.key, s.legacyIndex]));
const codeRow = (d) => [LEGACY_INDEX[d.system], d.code, d.display, d.description, d.billable ? 1 : 0];
const indexNode = (d) => Object.fromEntries(NODE_KEYS.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]));
const tableRow = (d) => ({ t: d.t, l: d.l, c: d.c });
const noteEntry = (d) => Object.fromEntries(NOTE_KINDS.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]));

// ---------- write / verify ----------

// Validate every document, upsert them in batches, then delete documents that are not in the source.
const write = async (Model, docs, scope = {}) => {
  for (const doc of docs) {
    await new Model(doc).validate().catch((err) => fail(`${Model.modelName} ${doc._id}: ${err.message}`));
  }
  let upserted = 0;
  let modified = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const ops = docs.slice(i, i + BATCH).map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    }));
    const res = await Model.bulkWrite(ops, { ordered: false });
    upserted += res.upsertedCount;
    modified += res.modifiedCount;
  }
  const keep = new Set(docs.map((d) => d._id));
  const existing = await Model.find(scope).select('_id').lean();
  const stale = existing.map((d) => d._id).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += BATCH) {
    await Model.deleteMany({ _id: { $in: stale.slice(i, i + BATCH) } });
  }
  console.log(
    `  ${Model.modelName.padEnd(12)} ${JSON.stringify(scope).padEnd(22)} ${docs.length} docs: ` +
      `${upserted} new, ${modified} updated, ${docs.length - upserted - modified} unchanged, ${stale.length} stale removed`
  );
};

// Read the collection back in source order, rebuild the source value and compare.
const verify = async (label, Model, scope, sort, rebuild, expected) => {
  const docs = await Model.find(scope).sort(sort).lean();
  const actual = rebuild(docs);
  const count = Array.isArray(expected) ? expected.length : Object.keys(expected).length;
  if (docs.length !== count) fail(`${label}: source has ${count}, database has ${docs.length}`);
  if (canonical(actual) !== canonical(expected)) {
    const exp = Array.isArray(expected) ? expected : Object.entries(expected);
    const act = Array.isArray(actual) ? actual : Object.entries(actual);
    const i = exp.findIndex((e, k) => canonical(e) !== canonical(act[k]));
    fail(`${label}: entry ${i} differs from source\n  source: ${canonical(exp[i]).slice(0, 300)}\n  db:     ${canonical(act[i]).slice(0, 300)}`);
  }
  console.log(`  ✓ ${label}: ${count} entries identical to source`);
};

const seedCodes = async ({ dir = DEFAULT_DIR, only = DATASETS } = {}) => {
  const src = loadSource(dir);
  const has = (name) => only.includes(name);

  // 1. Check the whole source before writing anything.
  if (has('codes')) checkCodes(src.codes);
  if (has('index')) Object.entries(src.index).forEach(([idx, terms]) => terms.forEach((n, i) => checkNode(n, `${idx} index ${i}`)));
  if (has('tables')) Object.entries(src.tables).forEach(([t, rows]) => checkTableRows(t, rows));
  if (has('notes')) checkNotes(src.notes);
  console.log(`Source ${dir}: checked ${only.join(', ')}`);

  // 2. Write.
  console.log('Writing:');
  if (has('codes')) await write(Code, codeDocs(src.codes));
  if (has('index')) {
    for (const [index, terms] of Object.entries(src.index)) await write(IcdIndexTerm, indexDocs(index, terms), { index });
  }
  if (has('tables')) {
    for (const [table, rows] of Object.entries(src.tables)) await write(IcdTableRow, tableDocs(table, rows), { table });
  }
  if (has('notes')) await write(IcdNote, noteDocs(src.notes));

  // 3. Read back and compare with the source.
  console.log('Verifying:');
  if (has('codes')) {
    await verify('codes', Code, {}, { seq: 1 }, (docs) => docs.map(codeRow), src.codes);
    const bySystem = await Code.aggregate([{ $group: { _id: '$system', n: { $sum: 1 } } }]);
    bySystem.forEach((s) => console.log(`      ${s._id.padEnd(9)} ${s.n}`));
  }
  if (has('index')) {
    for (const [index, terms] of Object.entries(src.index)) {
      await verify(`${index} index`, IcdIndexTerm, { index }, { seq: 1 }, (docs) => docs.map(indexNode), terms);
    }
  }
  if (has('tables')) {
    for (const [table, rows] of Object.entries(src.tables)) {
      await verify(`${table} table`, IcdTableRow, { table }, { seq: 1 }, (docs) => docs.map(tableRow), rows);
      // Paths are derived from the row order; check them too.
      const docs = await IcdTableRow.find({ table }).sort({ seq: 1 }).select('path').lean();
      const bad = docs.findIndex((d, i) => canonical(d.path) !== canonical(rowPath(rows, i)));
      if (bad !== -1) fail(`${table} table: row ${bad} has a wrong path`);
    }
  }
  if (has('notes')) {
    await verify('notes', IcdNote, {}, { _id: 1 }, (docs) => Object.fromEntries(docs.map((d) => [d._id, noteEntry(d)])), src.notes);
  }
  console.log('Verified: the database matches the source files exactly');
};

const run = async () => {
  let exitCode = 0;
  try {
    const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
    const only = arg('only') ? arg('only').split(',').map((s) => s.trim().toLowerCase()) : DATASETS;
    const unknown = only.filter((d) => !DATASETS.includes(d));
    if (unknown.length) throw new Error(`Unknown dataset(s): ${unknown.join(', ')}. Use: ${DATASETS.join(', ')}`);

    await connectDB();
    await Promise.all([Code, IcdIndexTerm, IcdTableRow, IcdNote].map((M) => M.syncIndexes()));
    const started = Date.now();
    await seedCodes({ dir: arg('dir') ? path.resolve(arg('dir')) : DEFAULT_DIR, only });
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedCodes };
