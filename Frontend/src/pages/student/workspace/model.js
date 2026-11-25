/* CODIVIA — coding workspace: chart → documents, draft (the student's work), submission, code search. */
import { groupSectionsIntoTabs, parseRecordSections } from './recordSections.js';

// Option lists (work types, POA, dispositions, E/M levels, MS-DRGs, modifiers …) are not here:
// they come from the database via useReference() (GET /reference/work-queue).

// E/M levels of one patient type, from the reference list: [{ code, mdm, minutes }]
export const emGrid = (ref, grid) =>
  ((ref && ref.emLevels) || []).filter((l) => (l.meta || {}).grid === grid).map((l) => ({ code: l.value, mdm: l.label, minutes: (l.meta || {}).minutes || 0 }));
export const isEM = (c) => /^99(2[0-1][1-5]|20[2-5]|28[1-5])$/.test(String(c || ''));

export const LETTERS = 'ABCDEFGHIJKL';
export const norm = (s) => String(s || '').toUpperCase().replace(/[\s.]/g, '');
// HCPCS Level II: one letter + four digits (J1885, G2211). CPT is numeric (Category II/III end in F/T).
export const isHcpcs = (c) => /^[A-Z]\d{4}$/.test(norm(c));

// ---- outpatient / professional coding steps (E/M → CPT → HCPCS → ICD-10-CM → modifiers & Dx link) ----
export const CODING_STEPS = [
  ['em', 'E/M'],
  ['cpt', 'CPT'],
  ['hcpcs', 'HCPCS'],
  ['dx', 'ICD-10-CM'],
  ['mods', 'Modifiers & Dx link'],
];
// Charts coded in steps: everything with CPT / HCPCS charge lines (OP and IP professional).
export const usesSteps = (set) => !set.inpatient && set.hasLines;
// The step a charge line was entered in. E/M lines belong to the CPT step where the E/M step is not offered.
export const lineStep = (l, set) => (isHcpcs(l.code) ? 'hcpcs' : set.hasEM && isEM(norm(l.code)) ? 'em' : 'cpt');
let seq = 0;
export const uid = (p = 'r') => p + Date.now().toString(36) + (seq++).toString(36);

// ---- how the chart is coded: encounter type (OP / IP) and billing type ----
// The server sends the chart's encounterType / billingType (read-only for the student). Charts made
// before encounter types existed (encounterTypeSet false) keep the department-derived setup.
//   ip         - inpatient encounter: the first-listed diagnosis is the PRINCIPAL diagnosis
//   inpatient  - inpatient hospital (facility) claim: POA, ICD-10-PCS, abstract, MS-DRG
//   firstListed - 'principal' (IP) or 'primary' (OP)
// The Level of service (E/M) tab is offered only in these departments (a training choice). E/M codes
// typed in the CPT / HCPCS box are still accepted as charge lines in every department.
export const EM_DEPTS = ['EM', 'ED_PRO', 'ED_FAC'];
export function settingOf(chart) {
  const el = chart.elements || [];
  const emDept = EM_DEPTS.includes(chart.dept);
  const ed = /^ED/.test(chart.dept || '');
  const legacyIP = !!chart.isInpatient || el.includes('ICD10PCS') || el.includes('DRG');
  const encounterType = chart.encounterType === 'IP' || chart.encounterType === 'OP' ? chart.encounterType : legacyIP ? 'IP' : 'OP';
  const ip = encounterType === 'IP';
  const billingType = ip ? chart.billingType || 'facility' : null;
  const facility = ip && billingType === 'facility';
  const base = { encounterType, billingType, ip, inpatient: facility, ed, firstListed: ip ? 'principal' : 'primary', maxDx: facility ? 25 : 12 };
  if (!chart.encounterTypeSet) {
    // Older chart: what its department codes, as before.
    return {
      ...base,
      hasLines: !facility && (el.includes('CPT') || el.includes('HCPCS') || el.includes('EM')),
      hasEM: !facility && emDept && el.includes('EM'),
      hasPCS: el.includes('ICD10PCS'),
      hasDRG: el.includes('DRG'),
    };
  }
  // OP and IP professional: CPT / HCPCS charge lines. IP facility: ICD-10-PCS (+ MS-DRG when the department assigns DRGs).
  return { ...base, hasLines: !facility, hasEM: !facility && emDept && el.includes('EM'), hasPCS: facility, hasDRG: facility && el.includes('DRG') };
}

export const ENCOUNTER_LABEL = { OP: 'Outpatient', IP: 'Inpatient' };
export const BILLING_LABEL = { facility: 'Hospital facility', professional: 'Professional' };

// ---- diagnosis classification (draft.dx[].cls); the sequence is the list order ----
export const DX_CLASS_LABEL = { primary: 'Primary', principal: 'Principal', secondary: 'Secondary' };
export const firstTerm = (set) => (set.firstListed === 'principal' ? 'principal diagnosis' : 'primary diagnosis');
// The classifications offered for this encounter type: [value, label].
export const dxClassOptions = (set) => [
  [set.firstListed, set.firstListed === 'principal' ? 'Principal diagnosis' : 'Primary diagnosis (first-listed)'],
  ['secondary', 'Secondary diagnosis'],
];
// Keeps the one first-listed diagnosis in row 1 (other rows keep their order).
export function sequenceDx(dx, set) {
  const firsts = dx.filter((x) => x.cls === set.firstListed);
  if (firsts.length !== 1) return dx;
  return [firsts[0], ...dx.filter((x) => x !== firsts[0])];
}
// Drafts saved before diagnoses were classified: row 1 was the first-listed diagnosis.
export function classifyLegacyDx(dx, set) {
  if (!dx.length || dx.some((x) => x.cls)) return dx;
  return dx.map((x, i) => ({ ...x, cls: i === 0 ? set.firstListed : 'secondary' }));
}

// ICD-10-CM rows of the code DB by normalised code (a code can exist in two code sets).
const icdCache = new WeakMap();
export function icdRow(codeDB, code) {
  if (!codeDB) return null;
  let map = icdCache.get(codeDB);
  if (!map) {
    map = new Map();
    for (const r of codeDB) if (r[0] === 0 && !map.has(norm(r[1]))) map.set(norm(r[1]), r);
    icdCache.set(codeDB, map);
  }
  return map.get(norm(code)) || null;
}
export const isBillable = (row) => !!row && (row[4] === 1 || row[4] === '1' || row[4] === true);

// ---- demographics (for the patient header) ----
const DEMO_TAB = 'Demographics';
const titleCase = (s) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

// Plain charts: the record's demographic lines as [{ label, value }] plus any free-text header lines.
// Empty for charts that come with their own documents (their header comes from chart.encounter).
export function demographicsOf(chart) {
  if (chart.documents && chart.documents.length) return { pairs: [], notes: [] };
  const tabs = groupSectionsIntoTabs(parseRecordSections(chart.record));
  const demo = tabs.length > 1 && tabs.find((t) => t.tab === DEMO_TAB);
  if (!demo) return { pairs: [], notes: [] };
  const pairs = [];
  const notes = [];
  demo.sections.forEach((s) => {
    const head = s.head === 'RECORD' ? '' : titleCase(s.head);
    String(s.body || '')
      .split('\n')
      .flatMap((ln) => ln.split(/\s{3,}|\s\|\s|\t+/))
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((x) => {
        const m = x.match(/^([A-Za-z][A-Za-z0-9 #\/().'-]{1,40}):\s*(.+)$/);
        if (m) pairs.push({ label: m[1].trim(), value: m[2].trim() });
        else if (head) pairs.push({ label: head, value: x });
        else notes.push(x);
      });
  });
  return { pairs, notes };
}

// ---- documents ----
// A chart's documents, or (plain charts) its record split into document-like groups.
export function documentsOf(chart, queries = []) {
  let docs;
  if (chart.documents && chart.documents.length) {
    docs = chart.documents.map((d) => ({ key: d.key, title: d.title, sub: d.sub || '', sections: parseRecordSections(d.body) }));
  } else {
    let tabs = groupSectionsIntoTabs(parseRecordSections(chart.record));
    // Demographics go in the patient header (see demographicsOf), not in the document list —
    // unless they are the whole record, so nothing is lost.
    if (tabs.length > 1) tabs = tabs.filter((t) => t.tab !== DEMO_TAB);
    docs = tabs.length
      ? [{ key: 'full', title: 'Full record', sub: 'Every section', sections: tabs.flatMap((t) => t.sections) }].concat(
          tabs.map((t, i) => ({ key: 'g' + i, title: t.tab, sub: t.sections.map((s) => s.head).filter((h) => h !== 'RECORD').slice(0, 3).join(' · '), sections: t.sections })),
        )
      : [{ key: 'full', title: 'Record', sub: '', sections: [{ head: 'RECORD', body: chart.record || '' }] }];
  }
  queries
    .filter((q) => q.answered)
    .forEach((q, i) =>
      docs.push({
        key: 'qr' + q.id,
        title: 'Query Response' + (i ? ' ' + (i + 1) : ''),
        sub: (q.answeredAt ? new Date(q.answeredAt).toLocaleDateString() : 'Today') + ' · ' + q.to,
        isQuery: true,
        sections: [
          { head: 'QUERY', body: q.question },
          { head: 'RESPONSE', body: q.answer },
        ],
      }),
    );
  return docs;
}

// ---- code lookups (the code DB rows are [sysInt, code, display, description, billable]) ----
const descCache = new WeakMap();
export function codeDescriber(codeDB) {
  if (!codeDB) return () => '';
  let map = descCache.get(codeDB);
  if (!map) {
    map = new Map();
    for (const r of codeDB) {
      const k = norm(r[1]);
      if (!map.has(k)) map.set(k, r);
    }
    descCache.set(codeDB, map);
  }
  return (code) => {
    const r = map.get(norm(code));
    return r ? r[3] : '';
  };
}
export function codeRow(codeDB, code) {
  if (!codeDB) return null;
  codeDescriber(codeDB);
  return descCache.get(codeDB).get(norm(code)) || null;
}

// Same ranking as the old coder search: exact/prefix code first, then description position.
export function searchCodeDB(codeDB, q, systems, max = 40) {
  if (!codeDB || q.trim().length < 2) return [];
  const ql = q.toLowerCase().trim();
  const qcode = ql.replace('.', '');
  const terms = ql.split(/\s+/).filter(Boolean);
  const multi = terms.length > 1;
  const scored = [];
  for (let i = 0; i < codeDB.length; i++) {
    const row = codeDB[i];
    if (systems && !systems.includes(row[0])) continue;
    const codeRaw = row[1].toLowerCase();
    const disp = row[2].toLowerCase();
    const desc = row[3].toLowerCase();
    const codeMatch = codeRaw.startsWith(qcode) || disp.startsWith(ql);
    let score;
    if (multi) {
      if (!terms.every((t) => desc.includes(t)) && !codeMatch) continue;
      let first = 999;
      terms.forEach((t) => {
        const p = desc.indexOf(t);
        if (p !== -1 && p < first) first = p;
      });
      score = codeMatch ? 1 : 2 + Math.min(first, 200) / 1000;
    } else {
      const pos = desc.indexOf(ql);
      if (!codeMatch && pos === -1) continue;
      if (disp === ql || codeRaw === qcode) score = 0;
      else if (codeMatch) score = 1;
      else if (pos === 0) score = 2;
      else if (/(^|[^a-z])$/.test(desc.slice(0, pos))) score = 3;
      else score = 5 + Math.min(pos, 200) / 1000;
    }
    if (/during (a |other |an )?procedure|accidental (puncture|laceration)|complication|intraoperative|postprocedural|iatrogenic|sequela/.test(desc)) score += 3;
    if (/\bunspecified\b/.test(desc)) score += 0.3;
    if (row[4] === 1 || row[4] === '1') score -= 0.2;
    scored.push([score, desc.length, row]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return scored.slice(0, max).map((s) => s[2]);
}

// ---- the student's work (autosaved as `draft`) ----
const blank = () => ({
  v: 1,
  dx: [],
  lines: [],
  pcs: [],
  drg: '',
  abs: { admitType: '', admitSrc: '', disp: '', attending: '' },
  emTime: '',
  ptGrid: 'est',
  evidence: [],
  notes: '',
  acks: [],
  decision: '',
  comment: '',
  step: 1,
  session: '',
  notified: false,
});
// (`session` in the draft mirrors the server-issued charge-correction session for denials.)

export function patientType(chart) {
  const e = chart.encounter || {};
  if (e.ptype) return e.ptype;
  const m = String(chart.record || '').match(/Patient type[:\s]+(New patient|Established patient)/i);
  return m ? (/^new/i.test(m[1]) ? 'new' : 'est') : '';
}

// Where a chart starts: the saved draft, else what arrived with it (review / DRG / denial), else empty.
export function initialDraft(chart, describe) {
  const set = settingOf(chart);
  if (chart.work && chart.work.draft) {
    const saved = { ...blank(), ...chart.work.draft };
    return { ...saved, dx: classifyLegacyDx(saved.dx || [], set) };
  }
  const d = blank();
  d.ptGrid = set.ed ? 'ed' : patientType(chart) === 'new' ? 'new' : 'est';
  if (set.inpatient) {
    const e = chart.encounter || {};
    d.abs = { admitType: '', admitSrc: '', disp: '', attending: e.provider || '' };
  }
  const o = chart.original;
  // Only denial work starts from the billed claim (the student corrects those lines). Every other
  // chart starts empty: the student codes it; a review chart's original charges stay visible
  // under Charge lines → Original / Compare.
  if (o && chart.workType === 'denial') {
    d.dx = (o.dx || []).map((x, i) => ({ id: uid('d'), code: x.code, desc: describe(x.code), poa: x.poa || '', cls: i === 0 ? set.firstListed : 'secondary', ev: [] }));
    const idOf = (code) => (d.dx.find((x) => norm(x.code) === norm(code)) || {}).id;
    d.lines = (o.lines || []).map((l) => ({
      id: uid('l'),
      code: l.code,
      desc: describe(l.code),
      mods: [...(l.mods || []), '', '', '', ''].slice(0, 4),
      units: l.units || 1,
      ptrs: (l.ptrs || []).map(idOf).filter(Boolean),
    }));
    d.pcs = (o.pcs || []).map((c) => ({ id: uid('p'), code: c, desc: describe(c), date: '', ev: [] }));
    if (o.disp) d.abs.disp = o.disp;
    if (o.drg) d.drg = o.drg;
  }
  return d;
}

// What the server grades.
export function toSubmission(d) {
  const codeOf = (id) => (d.dx.find((x) => x.id === id) || {}).code;
  return {
    dx: d.dx.map((x) => ({ code: x.code, poa: x.poa || '', cls: x.cls || '' })),
    lines: d.lines.map((l) => ({ code: l.code, mods: l.mods.filter(Boolean), units: l.units || 1, ptrs: l.ptrs.map(codeOf).filter(Boolean) })),
    pcs: d.pcs.map((p) => p.code),
    drg: d.drg || '',
    disp: (d.abs && d.abs.disp) || '',
    decision: d.decision || '',
    comment: d.comment || '',
    notified: !!d.notified,
  };
}

export const fmtTime = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
export const money = (n) => '$' + Number(n || 0).toFixed(2);
