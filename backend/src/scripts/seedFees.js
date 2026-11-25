// Loads the Medicare Physician Fee Schedule "PFS Relative Value Files" from CMS into MongoDB.
// Separate from the code DB (`npm run seed:codes` / the `codes` collection is not touched).
//
// Source: backend/src/data/RVU<yy><letter>/ — one folder per CMS release, unzipped as downloaded
// (RVU26A = January, RVU26B = April, RVU26C = July …). Only the .csv files are read:
//   PPRRVU<year>_<month>_nonQPP.csv -> feervus       (variant nonQPP — the usual conversion factor)
//   PPRRVU<year>_<month>_QPP.csv    -> feervus       (variant QPP — qualifying APM participants)
//   GPCI<year>.csv                  -> feegpcis
//   <yy>LOCCO.csv                   -> feelocalities
//   ANES<year>.csv                  -> feeanesthesia
//   OPPSCAP_<month>.csv             -> feeoppscaps
//   (the release itself)            -> feereleases   (title, release date, conversion factors, files)
//
// For every release: the files are read and checked first (columns, numbers, duplicates) — nothing is
// written if any file is wrong. Then the rows are written, rows no longer in the files are removed,
// and every collection is read back and compared with the files, value for value.
// A file a release does not have (e.g. RVU26C without 26LOCCO.csv) is taken from the latest earlier
// release of the same year that has it, and recorded as `copiedFrom`.
// The newest loaded release becomes the active one (the release the app prices codes from), unless
// --active says otherwise. Safe to re-run; re-running with a new release folder adds that release.
//
// Usage:
//   npm run seed:fees                                 every release folder found
//   npm run seed:fees -- --release=RVU26C             one release (or a comma list)
//   npm run seed:fees -- --active=RVU26B              only switch the active release (already loaded)
//   npm run seed:fees -- --release=RVU26D --active=RVU26D
//   npm run seed:fees -- --dry-run                    read and check the files, write nothing
//   npm run seed:fees -- --dir=<folder>               a different data folder
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { FeeRelease, FeeRvu, FeeGpci, FeeLocality, FeeAnesthesia, FeeOppsCap } = require('../models');
const { FEE_DATA_DIR, RELEASE_DIR, FEE_FILE_KINDS, FEE_KIND_LIST, REQUIRED_KINDS, RVU_VARIANTS } = require('../config/fees');
const { parseCsv, isBlankRow } = require('../utils/csv');

const BATCH = 1000;
const MODELS = { rvu: FeeRvu, rvuQpp: FeeRvu, gpci: FeeGpci, locality: FeeLocality, anesthesia: FeeAnesthesia, oppsCap: FeeOppsCap };

const fail = (msg) => {
  throw new Error(msg);
};
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// ---------- release folders ----------

// [{ id: 'RVU26C', year: 2026, letter: 'C', dir, files: { kind: fileName } }], oldest first.
const findReleases = (dataDir) => {
  if (!fs.existsSync(dataDir)) fail(`Data folder not found: ${dataDir}`);
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && RELEASE_DIR.test(d.name))
    .map((d) => {
      const [, yy, letter] = d.name.match(RELEASE_DIR);
      const dir = path.join(dataDir, d.name);
      const names = fs.readdirSync(dir);
      const files = {};
      FEE_KIND_LIST.forEach((kind) => {
        const hits = names.filter((n) => FEE_FILE_KINDS[kind].test(n));
        if (hits.length > 1) fail(`${d.name}: more than one ${kind} file (${hits.join(', ')})`);
        if (hits.length) files[kind] = hits[0];
      });
      return { id: d.name, year: 2000 + Number(yy), letter, dir, files };
    })
    .sort((a, b) => a.year - b.year || a.letter.localeCompare(b.letter));
};

// The file to load for one kind: the release's own, else the latest earlier release of the same year that has it.
const sourceFile = (rel, kind, all) => {
  if (rel.files[kind]) return { file: path.join(rel.dir, rel.files[kind]), rel: rel.id };
  const earlier = all.filter((r) => r.year === rel.year && r.letter < rel.letter && r.files[kind]).pop();
  return earlier ? { file: path.join(earlier.dir, earlier.files[kind]), rel: earlier.id, copied: true } : null;
};

// ---------- cell readers ----------

const numberCell = (value, where) => {
  const s = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) fail(`${where}: "${value}" is not a number`);
  return Number(s);
};
const textCell = (value) => String(value == null ? '' : value).trim();

// ---------- file parsers: rows -> { docs, meta } ----------

// PPRRVU: 9 title / header lines; the column titles are spread over the last 5 header lines.
const RVU_COLUMNS = [
  ['hcpcs', 'HCPCS'],
  ['mod', 'MOD'],
  ['description', 'DESCRIPTION'],
  ['status', 'STATUS CODE'],
  ['notUsedForMedicare', 'NOT USED FOR MEDICARE PAYMENT'],
  ['workRvu', 'WORK RVU', 'n'],
  ['nonFacilityPeRvu', 'NON-FAC PE RVU', 'n'],
  ['nonFacilityNa', 'NON-FAC NA INDICATOR', 'na'],
  ['facilityPeRvu', 'FACILITY PE RVU', 'n'],
  ['facilityNa', 'FACILITY NA INDICATOR', 'na'],
  ['mpRvu', 'MP RVU', 'n'],
  ['nonFacilityTotal', 'NON-FACILITY TOTAL', 'n'],
  ['facilityTotal', 'FACILITY TOTAL', 'n'],
  ['pctcInd', 'PCTC IND'],
  ['globalDays', 'GLOB DAYS'],
  ['preOp', 'PRE OP', 'n'],
  ['intraOp', 'INTRA OP', 'n'],
  ['postOp', 'POST OP', 'n'],
  ['multProc', 'MULT PROC'],
  ['bilatSurg', 'BILAT SURG'],
  ['asstSurg', 'ASST SURG'],
  ['coSurg', 'CO- SURG'],
  ['teamSurg', 'TEAM SURG'],
  ['pricInd', 'PRIC IND'],
  ['endoBase', 'ENDO BASE'],
  ['conversionFactor', 'CONV FACTOR', 'n'],
  ['physicianSupervision', 'PHYSICIAN SUPERVISION OF DIAGNOSTIC PROCEDURES'],
  ['calculationFlag', 'CALCULATION FLAG'],
  ['imagingFamily', 'DIAGNOSTIC IMAGING FAMILY INDICATOR'],
  ['oppsNonFacilityPe', 'NON-FACILITY PE USED FOR OPPS PAYMENT AMOUNT', 'n'],
  ['oppsFacilityPe', 'FACILITY PE USED FOR OPPS PAYMENT AMOUNT', 'n'],
  ['oppsMp', 'MP USED FOR OPPS PAYMENT AMOUNT', 'n'],
];
const HCPCS = /^[A-Z0-9]{5}$/;

const parseRvu = (variant) => (rows, { release, name }) => {
  const hi = rows.findIndex((r) => textCell(r[0]) === 'HCPCS' && textCell(r[1]) === 'MOD');
  if (hi < 0) fail(`${name}: header line "HCPCS, MOD, …" not found`);
  const block = rows.slice(Math.max(0, hi - 4), hi + 1);
  RVU_COLUMNS.forEach(([, label], c) => {
    const found = squash(block.map((r) => textCell(r[c])).filter(Boolean).join(' '));
    if (found !== label) fail(`${name}: column ${c + 1} should be "${label}", found "${found}" — has the CMS layout changed?`);
  });
  const top = rows.slice(0, hi).flat().map(textCell);
  const title = top.find((t) => /Relative Value File/i.test(t)) || '';
  const releasedOn = ((top.find((t) => /^RELEASED\s/i.test(t)) || '').match(/RELEASED\s+(\S+)/i) || [])[1] || '';
  const docs = [];
  const cfs = new Set();
  rows.slice(hi + 1).forEach((r, k) => {
    const line = hi + 2 + k;
    if (isBlankRow(r)) return;
    const where = `${name} line ${line}`;
    if (r.length < RVU_COLUMNS.length) fail(`${where}: ${r.length} columns, expected ${RVU_COLUMNS.length}`);
    const doc = { release, variant };
    RVU_COLUMNS.forEach(([key, label, type], c) => {
      if (type === 'n') doc[key] = numberCell(r[c], `${where} ${label}`);
      else if (type === 'na') {
        const v = textCell(r[c]);
        if (v !== '' && v !== 'NA') fail(`${where} ${label}: "${v}" (expected NA or blank)`);
        doc[key] = v === 'NA';
      } else doc[key] = textCell(r[c]);
    });
    if (!HCPCS.test(doc.hcpcs)) fail(`${where}: "${doc.hcpcs}" is not a HCPCS / CPT code`);
    if (!doc.status) fail(`${where}: status code is empty`);
    doc._id = `${release}:${variant}:${doc.hcpcs}:${doc.mod}`;
    doc.seq = docs.length;
    cfs.add(doc.conversionFactor);
    docs.push(doc);
  });
  if (!docs.length) fail(`${name}: no code rows`);
  if (cfs.size !== 1) fail(`${name}: more than one conversion factor (${[...cfs].join(', ')})`);
  return { docs, meta: { title, releasedOn, conversionFactor: [...cfs][0] } };
};

// Find a header line and map named columns by matching their titles (CMS adds / drops columns).
const headerMap = (rows, name, isHeader, columns) => {
  const hi = rows.findIndex((r) => isHeader(r.map(textCell)));
  if (hi < 0) fail(`${name}: header line not found`);
  const titles = rows[hi].map(squash);
  const map = {};
  Object.entries(columns).forEach(([key, [test, optional]]) => {
    const c = titles.findIndex((t) => test(t));
    if (c < 0 && !optional) fail(`${name}: column for ${key} not found in header (${titles.filter(Boolean).join(' | ')})`);
    if (c >= 0) map[key] = c;
  });
  return { hi, titles, map };
};
const MAC = /^\d{5}$/;

const parseGpci = (rows, { release, name }) => {
  const { hi, map } = headerMap(rows, name, (r) => /^Medicare Administrative Contractor/i.test(r[0]), {
    mac: [(t) => /Contractor/i.test(t)],
    state: [(t) => /^State$/i.test(t)],
    locality: [(t) => /^Locality Number$/i.test(t)],
    name: [(t) => /^Locality Name$/i.test(t)],
    pwGpciWithoutFloor: [(t) => /PW GPCI.*without/i.test(t), true],
    pwGpci: [(t) => /PW GPCI/i.test(t) && !/without/i.test(t)],
    peGpci: [(t) => /PE GPCI/i.test(t)],
    mpGpci: [(t) => /MP GPCI/i.test(t)],
  });
  const docs = [];
  rows.slice(hi + 1).forEach((r, k) => {
    if (!MAC.test(textCell(r[0]))) return; // blank lines and the notes under the table
    const where = `${name} line ${hi + 2 + k}`;
    const doc = { release, mac: textCell(r[map.mac]), state: textCell(r[map.state]), locality: textCell(r[map.locality]), name: textCell(r[map.name]) };
    ['pwGpci', 'peGpci', 'mpGpci'].forEach((key) => (doc[key] = numberCell(r[map[key]], `${where} ${key}`)));
    if (map.pwGpciWithoutFloor != null) doc.pwGpciWithoutFloor = numberCell(r[map.pwGpciWithoutFloor], `${where} pwGpciWithoutFloor`);
    if (!doc.state || !doc.locality || !doc.name) fail(`${where}: state, locality or name is empty`);
    doc._id = `${release}:${doc.mac}:${doc.locality}`;
    doc.seq = docs.length;
    docs.push(doc);
  });
  return { docs, meta: {} };
};

const parseLocality = (rows, { release, name }) => {
  const { hi, map } = headerMap(rows, name, (r) => /^Medicare Adm/i.test(r[0]) && r.some((c) => /Locality Number/i.test(c)), {
    mac: [(t) => /Contractor/i.test(t)],
    locality: [(t) => /^Locality Number$/i.test(t)],
    state: [(t) => /^State$/i.test(t)],
    area: [(t) => /^Fee Schedule Area$/i.test(t)],
    counties: [(t) => /^Counties$/i.test(t)],
  });
  const docs = [];
  let state = '';
  rows.slice(hi + 1).forEach((r, k) => {
    if (!MAC.test(textCell(r[0]))) return; // blank spacer lines and the footnotes
    const where = `${name} line ${hi + 2 + k}`;
    state = textCell(r[map.state]) || state; // CMS prints the state once per group
    const doc = { release, mac: textCell(r[map.mac]), locality: textCell(r[map.locality]), state, area: textCell(r[map.area]), counties: textCell(r[map.counties]) };
    if (!doc.state || !doc.locality || !doc.area || !doc.counties) fail(`${where}: state, locality, area or counties is empty`);
    doc._id = `${release}:${doc.mac}:${doc.locality}`;
    // CMS prints some localities twice (e.g. Missouri "REST OF STATE*" in 2026): skip an exact repeat.
    const same = docs.find((d) => d._id === doc._id);
    if (same) {
      const fields = ['state', 'area', 'counties'];
      if (fields.every((f) => same[f].replace(/\s+/g, '') === doc[f].replace(/\s+/g, ''))) {
        console.log(`  note: ${where} repeats locality ${doc.mac}/${doc.locality} — skipped`);
        return;
      }
      fail(`${where}: locality ${doc.mac}/${doc.locality} is listed twice with different values`);
    }
    doc.seq = docs.length;
    docs.push(doc);
  });
  return { docs, meta: {} };
};

const parseAnesthesia = (rows, { release, name }) => {
  const { hi, titles, map } = headerMap(rows, name, (r) => /^Contractor$/i.test(r[0]), {
    contractor: [(t) => /^Contractor$/i.test(t)],
    locality: [(t) => /^Locality$/i.test(t)],
    name: [(t) => /^Locality Name$/i.test(t)],
    nonQppConversionFactor: [(t) => /Non-Qualifying APM.*Anes CF/i.test(t)],
    qppConversionFactor: [(t) => /^Qualifying APM.*Anes CF/i.test(t)],
  });
  // The national anesthesia conversion factors are printed in the column titles ("… of 20.599835").
  const national = (key) => {
    const m = titles[map[key]].match(/of\s+(\d+(\.\d+)?)\s*$/i);
    return m ? Number(m[1]) : undefined;
  };
  const docs = [];
  rows.slice(hi + 1).forEach((r, k) => {
    if (!MAC.test(textCell(r[0]))) return;
    const where = `${name} line ${hi + 2 + k}`;
    const doc = { release, contractor: textCell(r[map.contractor]), locality: textCell(r[map.locality]), name: textCell(r[map.name]) };
    doc.qppConversionFactor = numberCell(r[map.qppConversionFactor], `${where} QPP CF`);
    doc.nonQppConversionFactor = numberCell(r[map.nonQppConversionFactor], `${where} non-QPP CF`);
    if (!doc.locality || !doc.name) fail(`${where}: locality or name is empty`);
    doc._id = `${release}:${doc.contractor}:${doc.locality}`;
    doc.seq = docs.length;
    docs.push(doc);
  });
  return { docs, meta: { anesthesiaConversionFactor: { qpp: national('qppConversionFactor'), nonQpp: national('nonQppConversionFactor') } } };
};

const parseOppsCap = (rows, { release, name }) => {
  const { hi, map } = headerMap(rows, name, (r) => r[0] === 'HCPCS' && /PROCSTAT/i.test(r.join(' ')), {
    hcpcs: [(t) => t === 'HCPCS'],
    mod: [(t) => t === 'MOD'],
    procStatus: [(t) => t === 'PROCSTAT'],
    carrier: [(t) => t === 'CARRIER'],
    locality: [(t) => t === 'LOCALITY'],
    facilityPrice: [(t) => /^FACILITY PRICE$/i.test(t)],
    nonFacilityPrice: [(t) => /^NON-FACI?LI?TY PRICE$/i.test(t)], // CMS spells it "NON-FACILTY"
  });
  const docs = [];
  rows.slice(hi + 1).forEach((r, k) => {
    if (isBlankRow(r)) return;
    const where = `${name} line ${hi + 2 + k}`;
    const doc = { release, hcpcs: textCell(r[map.hcpcs]), mod: textCell(r[map.mod]), procStatus: textCell(r[map.procStatus]), carrier: textCell(r[map.carrier]), locality: textCell(r[map.locality]) };
    if (!HCPCS.test(doc.hcpcs)) fail(`${where}: "${doc.hcpcs}" is not a HCPCS / CPT code`);
    if (!doc.carrier || !doc.locality) fail(`${where}: carrier or locality is empty`);
    doc.facilityPrice = numberCell(r[map.facilityPrice], `${where} facility price`);
    doc.nonFacilityPrice = numberCell(r[map.nonFacilityPrice], `${where} non-facility price`);
    doc._id = `${release}:${doc.hcpcs}:${doc.mod}:${doc.carrier}:${doc.locality}`;
    doc.seq = docs.length;
    docs.push(doc);
  });
  return { docs, meta: {} };
};

const PARSERS = {
  rvu: parseRvu(RVU_VARIANTS.NON_QPP),
  rvuQpp: parseRvu(RVU_VARIANTS.QPP),
  gpci: parseGpci,
  locality: parseLocality,
  anesthesia: parseAnesthesia,
  oppsCap: parseOppsCap,
};
// Which documents of a collection belong to one kind of one release (for stale removal / verification).
const scopeOf = (kind, release) =>
  kind === 'rvu' ? { release, variant: RVU_VARIANTS.NON_QPP } : kind === 'rvuQpp' ? { release, variant: RVU_VARIANTS.QPP } : { release };

// ---------- read + check one release ----------

const readRelease = (rel, all, dataDir) => {
  const kinds = {};
  const missing = [];
  FEE_KIND_LIST.forEach((kind) => {
    const src = sourceFile(rel, kind, all);
    if (!src) {
      if (REQUIRED_KINDS.includes(kind)) fail(`${rel.id}: required ${kind} file not found (${FEE_FILE_KINDS[kind]})`);
      missing.push(kind);
      return;
    }
    const name = path.relative(dataDir, src.file).split(path.sep).join('/');
    let rows;
    try {
      rows = parseCsv(fs.readFileSync(src.file, 'latin1')); // CMS files are Windows-1252 / Latin-1
    } catch (err) {
      fail(`${name}: ${err.message}`);
    }
    const { docs, meta } = PARSERS[kind](rows, { release: rel.id, name });
    const ids = new Set();
    docs.forEach((d) => {
      if (ids.has(d._id)) fail(`${name}: duplicate row ${d._id}`);
      ids.add(d._id);
    });
    kinds[kind] = { docs, meta, file: name, copiedFrom: src.copied ? src.rel : undefined };
    console.log(`  ${rel.id} ${kind.padEnd(10)} ${String(docs.length).padStart(6)} rows  ${name}${src.copied ? `  (copied from ${src.rel}: ${rel.id} has no ${kind} file)` : ''}`);
  });
  const rvu = kinds.rvu.meta;
  const release = {
    _id: rel.id,
    year: rel.year,
    letter: rel.letter,
    title: rvu.title,
    releasedOn: rvu.releasedOn,
    conversionFactor: { nonQpp: rvu.conversionFactor, ...(kinds.rvuQpp ? { qpp: kinds.rvuQpp.meta.conversionFactor } : {}) },
    ...(kinds.anesthesia ? { anesthesiaConversionFactor: kinds.anesthesia.meta.anesthesiaConversionFactor } : {}),
    files: Object.entries(kinds).map(([kind, k]) => ({ kind, file: k.file, rows: k.docs.length, ...(k.copiedFrom ? { copiedFrom: k.copiedFrom } : {}) })),
    missing,
  };
  return { release, kinds };
};

// ---------- write / verify ----------

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

const write = async (Model, docs, scope, label) => {
  for (const doc of docs) {
    await new Model(doc).validate().catch((err) => fail(`${Model.modelName} ${doc._id}: ${err.message}`));
  }
  let upserted = 0;
  let modified = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const ops = docs.slice(i, i + BATCH).map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }));
    const res = await Model.bulkWrite(ops, { ordered: false });
    upserted += res.upsertedCount;
    modified += res.modifiedCount;
  }
  const keep = new Set(docs.map((d) => d._id));
  const stale = (await Model.find(scope).select('_id').lean()).map((d) => d._id).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += BATCH) await Model.deleteMany({ _id: { $in: stale.slice(i, i + BATCH) } });
  console.log(`  ${label.padEnd(18)} ${String(docs.length).padStart(6)} rows: ${upserted} new, ${modified} updated, ${docs.length - upserted - modified} unchanged, ${stale.length} stale removed`);
};

const verify = async (Model, docs, scope, label) => {
  const saved = await Model.find(scope).sort({ seq: 1 }).lean();
  if (saved.length !== docs.length) fail(`${label}: file has ${docs.length} rows, database has ${saved.length}`);
  const i = docs.findIndex((d, k) => canonical(d) !== canonical(saved[k]));
  if (i !== -1) fail(`${label}: row ${i} differs from the file\n  file: ${canonical(docs[i]).slice(0, 300)}\n  db:   ${canonical(saved[i]).slice(0, 300)}`);
  console.log(`  ✓ ${label}: ${docs.length} rows identical to the file`);
};

const saveRelease = async ({ release, kinds }) => {
  for (const [kind, k] of Object.entries(kinds)) await write(MODELS[kind], k.docs, scopeOf(kind, release._id), `${release._id} ${kind}`);
  // A kind this release no longer has: remove its old rows.
  for (const kind of release.missing) {
    const { deletedCount } = await MODELS[kind].deleteMany(scopeOf(kind, release._id));
    if (deletedCount) console.log(`  ${release._id} ${kind}: ${deletedCount} old rows removed (no file in this release)`);
  }
  const prev = await FeeRelease.findById(release._id).lean();
  const doc = { ...release, active: prev ? !!prev.active : false, loadedAt: new Date() };
  await new FeeRelease(doc).validate();
  await FeeRelease.replaceOne({ _id: release._id }, doc, { upsert: true });
  for (const [kind, k] of Object.entries(kinds)) await verify(MODELS[kind], k.docs, scopeOf(kind, release._id), `${release._id} ${kind}`);
};

// Exactly one active release.
const setActive = async (id) => {
  const rel = await FeeRelease.findById(id).lean();
  if (!rel) fail(`Release ${id} is not loaded — load it first (--release=${id})`);
  await FeeRelease.updateMany({ _id: { $ne: id } }, { $set: { active: false } });
  await FeeRelease.updateOne({ _id: id }, { $set: { active: true } });
  console.log(`Active release: ${id} — ${rel.title || ''} (conversion factor $${rel.conversionFactor.nonQpp})`);
};

// ---------- main ----------

const seedFees = async ({ dataDir = FEE_DATA_DIR, releases: wanted, active, dryRun = false } = {}) => {
  const all = findReleases(dataDir);
  const onlyActive = active && !wanted;
  if (!onlyActive) {
    if (!all.length) fail(`No release folders (RVU<yy><letter>) in ${dataDir}`);
    const pick = wanted ? wanted.map((id) => all.find((r) => r.id === id) || fail(`Release folder ${id} not found in ${dataDir}`)) : all;

    // 1. Read and check every file of every release before writing anything.
    console.log(`Reading ${dataDir}:`);
    const loaded = pick.map((rel) => readRelease(rel, all, dataDir));
    if (dryRun) {
      console.log('Dry run: every file read and checked; nothing written.');
      return;
    }
    // 2. Write and verify, release by release.
    for (const r of loaded) {
      console.log(`Writing ${r.release._id}:`);
      await saveRelease(r);
    }
  }
  if (dryRun) return;
  // 3. The active release: as asked, else the newest loaded release.
  if (active) await setActive(active);
  else {
    const newest = (await FeeRelease.find().sort({ year: -1, letter: -1 }).limit(1).lean())[0];
    if (newest) await setActive(newest._id);
  }
};

const run = async () => {
  let exitCode = 0;
  try {
    const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
    const list = (v) => (v ? v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : undefined);
    const opts = {
      dataDir: arg('dir') ? path.resolve(arg('dir')) : FEE_DATA_DIR,
      releases: list(arg('release')),
      active: list(arg('active'))?.[0],
      dryRun: process.argv.includes('--dry-run'),
    };
    const started = Date.now();
    if (!opts.dryRun) {
      await connectDB();
      await Promise.all([FeeRelease, FeeRvu, FeeGpci, FeeLocality, FeeAnesthesia, FeeOppsCap].map((M) => M.syncIndexes()));
    }
    await seedFees(opts);
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`Fee schedule load failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedFees };
