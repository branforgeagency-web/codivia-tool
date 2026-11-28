const { CHART_IMPORT: C } = require('../config/chartImport');
const { CASE_LIMITS, UPLOAD_LIMITS } = require('../config/chartUploads');
const { POA_VALUES } = require('../config/workQueue');

// Reads the text of an uploaded chart file into the upload form's fields (config/chartImport.js
// says which words mean what). Returns { record, fields, found }: record = what students read,
// fields = the saved-chart shape (dept, title, patient, encounter, answerKey …), found = what was filled.

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const clip = (s, max = CASE_LIMITS.short) => String(s || '').trim().slice(0, max);
const MARKER = /^\s*={3,}\s*(.+?)\s*={3,}\s*$/;
const LABEL_LINE = /^\s*([A-Za-z][A-Za-z0-9 #/&().'-]{0,40}?)\s*:\s*(.*?)\s*$/;

// { 'word as written': value } lookups built once from the config lists.
const lookup = (groups) => {
  const m = new Map();
  Object.entries(groups).forEach(([value, words]) => words.forEach((w) => m.set(norm(w), value)));
  return m;
};
const LABELS = Object.fromEntries(Object.entries(C.labels).map(([g, fields]) => [g, lookup(fields)]));
const VALUES = Object.fromEntries(Object.entries(C.values).filter(([, v]) => !Array.isArray(v)).map(([k, v]) => [k, lookup(v)]));
const BLOCKS = lookup(C.blocks);
const KEY_TYPES = lookup(C.keyTypes);
const ORIGINAL_ROWS = lookup(C.originalRows);
const EXTRAS = lookup(C.keyExtras);
const YES = new Set(C.values.yes.map(norm));
const NOT_REPORTED = new Set(C.notReported.map(norm));
const HISTORY = new Set(C.historyRow.map(norm));
const CLINICAL_KINDS = lookup(Object.fromEntries(Object.entries(C.clinicalRows).map(([k, v]) => [k, v.words])));

const pick = (kind, v) => VALUES[kind].get(norm(v)) || '';
const int = (v) => {
  const m = String(v || '').match(/\d+/);
  return m ? Number(m[0]) : null;
};
const money = (v) => {
  const n = Number(String(v || '').replace(/[$,\s]/g, ''));
  return String(v || '').trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
};
const codes = (v, max) =>
  String(v || '')
    .split(/[,\s]+/)
    .map((x) => x.trim().toUpperCase())
    .filter((x) => x && x !== '-')
    .slice(0, max);
const cells = (line) => line.split('|').map((x) => x.trim());
const days = (a, b) => {
  const d = (s) => Date.parse(String(s || '').replace(/-/g, '/'));
  const n = Math.round((d(b) - d(a)) / 86400000);
  return Number.isFinite(n) && n >= 0 && n <= 365 ? n : null;
};

// File text → { name: [lines] }; text outside any known block belongs to the chart.
// Repeatable blocks (config repeatBlocks) are kept apart: out.lists[name] = [[lines], [lines] …].
function splitBlocks(text) {
  const out = { chart: [], lists: {} };
  let cur = out.chart;
  String(text || '')
    .split('\n')
    .forEach((line) => {
      const m = line.match(MARKER);
      if (m) {
        const name = BLOCKS.get(norm(m[1])) || 'chart';
        if (C.repeatBlocks.includes(name)) {
          cur = [];
          (out.lists[name] = out.lists[name] || []).push(cur);
        } else cur = out[name] = out[name] || [];
        return;
      }
      cur.push(line);
    });
  return out;
}

// PREVIOUS RECORD blocks → chart.previousRecords: labels, "TYPE | CODE | desc" code rows, and the
// rest of the lines as the visit's note.
function readPrevious(list) {
  return list.slice(0, CASE_LIMITS.previousRecords).map((lines, i) => {
    const used = new Set();
    const P = readLabels(lines, ['previous'], (li) => used.add(li));
    const codesBilled = [];
    lines.forEach((line, li) => {
      if (!line.includes('|')) return;
      const row = keyRow(cells(line));
      if (!row) return;
      used.add(li);
      if (codesBilled.length >= CASE_LIMITS.previousCodes) return;
      const c = { code: clip(row.code, CASE_LIMITS.code), desc: clip(row.desc, CASE_LIMITS.desc), type: row.type };
      if (row.poa) c.poa = row.poa;
      if (row.mods && row.mods.length) c.mods = row.mods;
      if (row.units) c.units = row.units;
      codesBilled.push(c);
    });
    const title = clip(P['previous.title'], CASE_LIMITS.docTitle) || 'Office Visit';
    const body = lines
      .filter((_, li) => !used.has(li))
      .join('\n')
      .replace(/^\s*\n+|\n+\s*$/g, '')
      .slice(0, CASE_LIMITS.docBody);
    const rec = { key: 'prev' + (i + 1), title, body: body || title, codes: codesBilled };
    ['dos', 'provider', 'facility', 'episode', 'noteType', 'arrival', 'departure', 'acuity', 'disposition'].forEach((k) => P['previous.' + k] && (rec[k] = clip(P['previous.' + k])));
    return rec;
  });
}

// "KIND | cell | cell …" rows → { labs: [{ test, value … }], meds: […] … } (config clinicalRows).
// lines = [[text, onUsed?]]; onUsed() is called for each row read.
function readClinical(lines) {
  const out = {};
  lines.forEach(([line, onUsed]) => {
    if (!line.includes('|')) return;
    const c = cells(line);
    const kind = CLINICAL_KINDS.get(norm(c[0]));
    if (!kind || !c.slice(1).some(Boolean)) return;
    if (onUsed) onUsed();
    const list = (out[kind] = out[kind] || []);
    if (list.length >= CASE_LIMITS.clinicalRows) return;
    const row = {};
    const { fields, limits = {} } = C.clinicalRows[kind];
    fields.forEach((f, i) => c[i + 1] && c[i + 1] !== '-' && (row[f] = clip(c[i + 1], limits[f])));
    list.push(row);
  });
  return out;
}

// One note as a chart document. Missing author / specialty / date come from the visit.
function noteDoc(key, n, visit) {
  const author = clip(n.author) || visit.provider || '';
  const date = clip(n.date) || visit.date || '';
  const type = clip(n.type) || 'Progress Notes';
  const doc = { key, title: clip(n.title, CASE_LIMITS.docTitle) || type, sub: [date, author].filter(Boolean).join(' · '), type, author, specialty: clip(n.specialty) || (n.author ? '' : visit.specialty || ''), date, status: clip(n.status), recipient: clip(n.recipient), body: String(n.body).slice(0, CASE_LIMITS.docBody) };
  Object.keys(doc).forEach((k) => doc[k] === '' && k !== 'sub' && delete doc[k]);
  return doc;
}

// NOTE blocks → chart.documents (one note each); the lines that are not labels are its text.
function readNotes(list, visit) {
  return list
    .map((lines, i) => {
      const used = new Set();
      const N = readLabels(lines, ['note'], (li) => used.add(li));
      const body = lines
        .filter((_, li) => !used.has(li))
        .join('\n')
        .trim();
      if (!body) return null;
      return noteDoc('n' + (i + 1), { type: N['note.type'], title: N['note.title'], author: N['note.author'], specialty: N['note.specialty'], date: N['note.date'], status: N['note.status'], recipient: N['note.recipient'], body }, visit);
    })
    .filter(Boolean);
}

// EPISODE blocks → chart.episodes. An episode named by a visit but not described gets a plain
// Active entry, so every visit's episode is listed.
function readEpisodes(list, named) {
  const out = [];
  const seen = new Set();
  const add = (ep) => {
    if (!ep.name || seen.has(norm(ep.name)) || out.length >= CASE_LIMITS.episodes) return;
    seen.add(norm(ep.name));
    out.push({ key: 'ep' + (out.length + 1), ...ep });
  };
  list.forEach((lines) => {
    const E = readLabels(lines, ['episode']);
    const ep = { name: clip(E['episode.name']), status: pick('episodeStatus', E['episode.status']) || clip(E['episode.status']) || 'Active' };
    ['type', 'start', 'end', 'provider'].forEach((k) => E['episode.' + k] && (ep[k] = clip(E['episode.' + k])));
    if (E['episode.dx']) ep.dx = clip(E['episode.dx'], CASE_LIMITS.desc);
    if (E['episode.note']) ep.note = clip(E['episode.note'], CASE_LIMITS.why);
    add(ep);
  });
  named.filter(Boolean).forEach((name) => add({ name, status: 'Active' }));
  return out;
}

// "Label: value" pairs of one block, for the given label groups. An empty value takes the next
// plain line (e.g. "Allergies:" on one line, "NKDA" on the next). repeat = fields kept as lists.
function readLabels(lines, groups, onLine) {
  const got = {};
  lines.forEach((line, i) => {
    const m = line.match(LABEL_LINE);
    if (!m) return;
    const label = norm(m[1]);
    const group = groups.find((g) => LABELS[g].has(label));
    if (!group) return;
    let value = m[2];
    if (!value) {
      const next = lines.slice(i + 1).find((l) => l.trim());
      value = next && !LABEL_LINE.test(next) && !/^[A-Z0-9 /&()',.-]{3,45}:\s*$/.test(next.trim()) ? next.trim() : '';
    }
    if (!value) return;
    const field = LABELS[group].get(label);
    const key = group + '.' + field;
    if (group === 'original' && field === 'rules') (got[key] = got[key] || []).push(value);
    else if (!(key in got)) got[key] = value;
    if (onLine) onLine(i, group);
  });
  return got;
}

// One answer key row: TYPE | CODE | description | why | extras ("POA: Y", "MOD: 25" …).
function keyRow(c) {
  const type = KEY_TYPES.get(norm(c[0]));
  if (!type || !c[1]) return null;
  const row = { type, code: clip(c[1], UPLOAD_LIMITS.code).toUpperCase(), desc: clip(c[2], UPLOAD_LIMITS.desc), why: clip(c[3], UPLOAD_LIMITS.why) };
  c.slice(4).forEach((cell) => {
    const m = cell.match(/^([^:]+):\s*(.*)$/);
    const extra = m && EXTRAS.get(norm(m[1]));
    if (!extra) return;
    const v = m[2].trim();
    if (extra === 'poa') {
      const poa = v.toUpperCase();
      if (POA_VALUES.includes(poa)) row.poa = poa;
    } else if (extra === 'mods') row.mods = v === '-' || norm(v) === 'none' ? [] : codes(v, 4).map((x) => x.slice(0, 2));
    else if (extra === 'units') row.units = int(v) || null;
    else if (extra === 'ptrs') row.ptrs = codes(v, 4);
    else if (extra === 'uncertain') row.uncertain = YES.has(norm(v));
  });
  return row;
}

function readChartText(text, { departments = [] } = {}) {
  const blocks = splitBlocks(text);
  const found = [];
  const note = (label, value) => value !== undefined && value !== null && value !== '' && found.push(label);

  // Setup labels are for the admin: dropped from the record even when written inside the chart.
  const setupLines = new Set();
  const bannerLines = new Set(); // patient / encounter / demographic lines: the banner, not a note's text
  const chartLabels = readLabels(blocks.chart, ['setup', 'patient', 'encounter', 'demographics'], (i, g) => (g === 'setup' ? setupLines : bannerLines).add(i));
  const L = { ...chartLabels, ...readLabels(blocks.setup || [], ['setup', 'patient', 'encounter', 'demographics']) };
  // LAB | … / MED | … rows: structured data, shown in their Chart Review tab, so kept out of the record.
  const clinical = readClinical([...blocks.chart.map((line, i) => [line, () => setupLines.add(i)]), ...(blocks.clinical || []).map((line) => [line])]);
  const record = blocks.chart
    .filter((_, i) => !setupLines.has(i))
    .join('\n')
    .replace(/^\s*\n+|\n+\s*$/g, '')
    .slice(0, UPLOAD_LIMITS.record);

  // Department: its key or its name.
  const deptText = norm(L['setup.dept']);
  const dept = deptText ? departments.find((d) => norm(d.id) === deptText || norm(d.name) === deptText) || departments.find((d) => norm(d.name).includes(deptText) || deptText.includes(norm(d.name))) : null;

  // Provider "Dr A. Rao, MD (Cardiology)": the specialty comes from the brackets when not given.
  let provider = clip(L['encounter.provider']);
  let specialty = clip(L['encounter.specialty']);
  const bracket = provider.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (bracket) {
    provider = bracket[1].trim();
    if (!specialty) specialty = bracket[2].trim();
  }

  const encounter = {};
  Object.keys(C.labels.encounter).forEach((f) => {
    if (L['encounter.' + f]) encounter[f] = clip(L['encounter.' + f]);
  });
  Object.assign(encounter, { provider, specialty });
  if (encounter.ptype) encounter.ptype = pick('ptype', encounter.ptype);
  encounter.los = int(L['encounter.los']);
  if (encounter.los === null && encounter.admit && encounter.discharge) encounter.los = days(encounter.admit, encounter.discharge);
  Object.keys(encounter).forEach((k) => (encounter[k] === '' || encounter[k] === null) && delete encounter[k]);

  // Encounter type as written; otherwise admit / discharge dates mean inpatient.
  let encounterType = pick('encounterType', L['setup.encounterType']);
  if (!encounterType) encounterType = encounter.admit || encounter.discharge ? 'IP' : 'OP';
  let billingType = pick('billingType', L['setup.billingType']);
  if (encounterType === 'IP' && !billingType) billingType = 'facility';
  if (encounterType !== 'IP') billingType = '';

  // Answer key, grading notes and "not reported" reasons.
  const answerKey = [];
  const extraWhy = {};
  const keyLines = blocks.key || [];
  keyLines.forEach((line) => {
    if (!line.includes('|')) return;
    const c = cells(line);
    if (NOT_REPORTED.has(norm(c[0])) && c[1]) extraWhy[c[1].toUpperCase().slice(0, CASE_LIMITS.code)] = clip(c[2], CASE_LIMITS.why);
    else {
      const row = keyRow(c);
      if (row && answerKey.length < UPLOAD_LIMITS.rows) answerKey.push(row);
    }
  });
  const K = readLabels(keyLines, ['keyMeta']);
  const keyMeta = {
    disp: clip(K['keyMeta.disp']),
    dispWhy: clip(K['keyMeta.dispWhy'], CASE_LIMITS.why),
    decision: pick('decision', K['keyMeta.decision']),
    decisionWhy: clip(K['keyMeta.decisionWhy'], CASE_LIMITS.why),
    extraWhy,
  };

  // Original coding (charge review, DRG validation, denial).
  const origLines = blocks.original || [];
  const O = readLabels(origLines, ['original']);
  const original = { dx: [], lines: [], pcs: [], disp: clip(O['original.disp']), drg: clip(O['original.drg'], 300), rules: (O['original.rules'] || []).map((r) => clip(r)).slice(0, 20), enteredBy: clip(O['original.enteredBy']) };
  origLines.forEach((line) => {
    if (!line.includes('|')) return;
    const c = cells(line);
    const kind = ORIGINAL_ROWS.get(norm(c[0]));
    if (!kind || !c[1]) return;
    const code = c[1].toUpperCase().slice(0, CASE_LIMITS.code);
    if (kind === 'dx') original.dx.push({ code, poa: POA_VALUES.includes((c[2] || '').toUpperCase()) ? c[2].toUpperCase() : '' });
    else if (kind === 'pcs') original.pcs.push(code);
    else {
      // After the pointers: a remit code (CO-97) and / or a billed amount, in either order or alone.
      const rest = c.slice(5).filter(Boolean);
      const amount = rest.find((x) => money(x) !== undefined);
      const remit = rest.find((x) => x !== amount) || '';
      original.lines.push({ code, mods: codes(c[2], 4).map((x) => x.slice(0, 2)), units: int(c[3]) || 1, ptrs: codes(c[4], 4), remit: clip(remit, 10).toUpperCase(), billed: money(amount) });
    }
  });

  // Denial: invoice labels and HISTORY | date | event | detail | amount rows.
  const denLines = blocks.denial || [];
  const D = readLabels(denLines, ['denial']);
  const denial = {
    queue: clip(D['denial.queue']),
    invoice: { num: clip(D['denial.num']), icn: clip(D['denial.icn']), status: clip(D['denial.status']) || 'Denied', received: clip(D['denial.received']), billed: money(D['denial.billed']), allowed: money(D['denial.allowed']), daysToAppeal: int(D['denial.daysToAppeal']) },
    history: denLines
      .filter((l) => l.includes('|') && HISTORY.has(norm(cells(l)[0])))
      .map((l) => [1, 2, 3, 4].map((i) => clip(cells(l)[i])))
      .slice(0, 50),
  };

  const details = {};
  Object.keys(C.labels.demographics).forEach((k) => {
    if (L['demographics.' + k]) details[k] = clip(L['demographics.' + k], 300);
  });
  const patient = { name: clip(L['patient.name'], UPLOAD_LIMITS.patientName), sex: pick('sex', L['patient.sex']), age: int(L['patient.age']) };
  // Notes of this visit (NOTE blocks). The CHART block's own narrative, if any, is the first note.
  const notes = readNotes(blocks.lists.note || [], { provider, specialty, date: encounter.dos || encounter.admit || '' });
  if (notes.length) {
    const lead = blocks.chart
      .filter((_, i) => !setupLines.has(i) && !bannerLines.has(i))
      .join('\n')
      .trim();
    if (lead) notes.unshift(noteDoc('n0', { type: 'Progress Notes', title: 'Progress Note', body: lead }, { provider, specialty, date: encounter.dos || encounter.admit || '' }));
  }
  const documents = notes.slice(0, CASE_LIMITS.documents);
  // The record keeps every note's text too (admin preview, search, audits).
  const fullRecord = [record, ...documents.filter((d) => d.key !== 'n0').map((d) => `${d.type.toUpperCase()}: ${d.title}\n${d.body}`)]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, UPLOAD_LIMITS.record);
  const previousRecords = readPrevious(blocks.lists.previous || []);
  const episodes = readEpisodes(blocks.lists.episode || [], [encounter.episode, ...previousRecords.map((r) => r.episode)]);
  const fields = {
    dept: dept ? dept.id : '',
    title: clip(L['setup.title'], UPLOAD_LIMITS.title),
    encounterType,
    billingType,
    workType: pick('workType', L['setup.workType']) || 'code',
    difficulty: pick('difficulty', L['setup.difficulty']) || 'moderate',
    patient: { name: patient.name, sex: patient.sex || 'F', age: patient.age === null ? '' : String(patient.age), details },
    encounter,
    original,
    denial,
    keyMeta,
    cdiResponse: clip((blocks.cdi || []).join('\n'), CASE_LIMITS.why),
    answerKey,
    previousRecords,
    episodes,
    ...(documents.length ? { documents } : {}),
    ...(Object.keys(clinical).length ? { clinical } : {}),
  };

  note('Department', fields.dept);
  note('Title', fields.title);
  found.push(L['setup.encounterType'] ? 'Encounter type' : 'Encounter type (guessed)');
  note('Work type', L['setup.workType'] && fields.workType);
  note('Patient', patient.name);
  note('Sex', patient.sex);
  note('Age', patient.age);
  Object.keys(encounter).forEach((k) => found.push(k === 'los' ? 'LOS' : C.labels.encounter[k][0]));
  if (answerKey.length) found.push(`Answer key (${answerKey.length} codes)`);
  if (original.dx.length || original.lines.length || original.pcs.length) found.push('Original coding');
  if (denLines.length) found.push('Denial details');
  if (previousRecords.length) found.push(`Earlier visits (${previousRecords.length})`);
  if (episodes.length) found.push(`Episodes (${episodes.length})`);
  if (documents.length) found.push(`Notes (${documents.length})`);
  Object.entries(clinical).forEach(([kind, list]) => found.push(`${C.clinicalRows[kind].label} (${list.length})`));
  return { record: fullRecord, fields, found };
}

module.exports = { readChartText };
