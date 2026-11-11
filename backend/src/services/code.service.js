const { Code, IcdIndexTerm, IcdTableRow, IcdNote } = require('../models');
const {
  CODE_SYSTEMS,
  CODE_SYSTEM_LIST,
  CODE_FILTERS,
  ICD_INDEX_LABELS,
  ICD_TABLE_META,
  NOTE_KINDS,
  NOTE_KIND_LABELS,
  CODE_LIMITS,
} = require('../config/codes');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex, normalizeTerm } = require('../utils/codeText');

const CODE_FIELDS = 'system code display description billable seq';
const ADD_ON_TEXT = 'List separately in addition to code for primary procedure';
const MODIFIER = /^\d{1,2}$|^[A-Z]{2}$/; // 25, 59, LT, RT ...

const stripCode = (code) => String(code || '').replace(/[.\-\s]/g, '').toUpperCase();

// Every response uses the original data structures of Frontend/public/data/codes, unchanged:
//   code       [system, code, display, description, billable]  e.g. [0, "A000", "A00.0", "Cholera ...", 1]
//   index term { t, c, s, sa, d }   (with its whole sub-term tree)
//   table row  { t, l, c }
//   notes      { inc, ex1, ex2, use, first, also, note }  (only the kinds the code has)
const LEGACY_INDEX = Object.fromEntries(CODE_SYSTEM_LIST.map((s) => [s.key, s.legacyIndex]));
const toRow = (d) => [LEGACY_INDEX[d.system], d.code, d.display, d.description, d.billable ? 1 : 0];
const INDEX_NODE = { _id: 0, t: 1, c: 1, s: 1, sa: 1, d: 1 };

// ---------- meta ----------

const getMeta = async () => {
  const [bySystem, byIndex, byTable, notes] = await Promise.all([
    Code.aggregate([{ $group: { _id: '$system', n: { $sum: 1 } } }]),
    IcdIndexTerm.aggregate([{ $group: { _id: '$index', n: { $sum: 1 } } }]),
    IcdTableRow.aggregate([{ $group: { _id: '$table', n: { $sum: 1 } } }]),
    IcdNote.estimatedDocumentCount(),
  ]);
  const count = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const [s, i, t] = [count(bySystem), count(byIndex), count(byTable)];
  return {
    systems: CODE_SYSTEM_LIST.map((sys) => ({ ...sys, count: s[sys.key] || 0 })),
    filters: Object.values(CODE_FILTERS),
    indexes: Object.entries(ICD_INDEX_LABELS).map(([key, label]) => ({ key, label, count: i[key] || 0 })),
    tables: Object.entries(ICD_TABLE_META).map(([key, m]) => ({ key, ...m, count: t[key] || 0 })),
    noteKinds: NOTE_KINDS.map((key) => ({ key, label: NOTE_KIND_LABELS[key] })),
    noteCount: notes,
  };
};

// ---------- code search ----------

// Rank a candidate the same way the old in-browser search did (lower score = better).
// Returns null when the row doesn't match. `row` holds lowercased code / display / description.
const scoreRow = (row, { ql, qcode, terms }) => {
  const { code: codeRaw, display: disp, description: desc } = row;
  const codeMatch = codeRaw.startsWith(qcode) || disp.startsWith(ql);
  let score;
  if (terms.length > 1) {
    if (!codeMatch && !terms.every((t) => desc.includes(t))) return null;
    let wordHits = 0;
    let first = 999;
    terms.forEach((t) => {
      const p = desc.indexOf(t);
      if (p !== -1 && p < first) first = p;
      if (new RegExp(`(^|[^a-z])${escapeRegex(t)}`).test(desc)) wordHits++;
    });
    score = codeMatch ? 1 : 2 + (terms.length - wordHits) + Math.min(first, 200) / 1000;
  } else {
    const p = desc.indexOf(ql);
    if (!codeMatch && p === -1) return null;
    if (disp === ql || codeRaw === qcode) score = 0;
    else if (codeMatch) score = 1;
    else if (p === 0) score = 2;
    else if (/(^|[^a-z])$/.test(desc.slice(0, p))) score = 3;
    else score = 5 + Math.min(p, 200) / 1000;
  }
  // Procedural complications rarely are what the user is looking for.
  if (/during (a |other |an )?procedure|accidental (puncture|laceration)|complication|intraoperative|postprocedural|iatrogenic/.test(desc)) {
    score += 3;
  }
  // 'sequela' is a normal 7th character on injury / external cause codes; demote it elsewhere only.
  if (/sequela/.test(desc) && !/^[VWXYST]/.test(row.rawDisplay)) score += 3;
  if (/\bunspecified\b/.test(desc)) score += 0.3;
  if (row.billable) score -= 0.2;
  return score;
};

// Description search is a substring match, which Mongo can only answer by scanning all ~170k codes
// (0.5-2 s per request). So the codes are read from Mongo once and kept in memory, already lowercased,
// and every search runs against that copy (a few ms). Mongo stays the source of truth: the copy is
// reloaded every CACHE_TTL_MS, and on the next search after a failed load.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = { rows: null, loadedAt: 0, loading: null };

const loadCodes = async () => {
  const docs = await Code.find().select(CODE_FIELDS).sort({ seq: 1 }).lean();
  return docs.map((d) => ({
    row: toRow(d),
    seq: d.seq,
    code: d.code.toLowerCase(),
    display: d.display.toLowerCase(),
    rawDisplay: d.display,
    description: d.description.toLowerCase(),
    descLength: d.description.length,
    system: d.system,
    billable: d.billable,
  }));
};

const getCodeRows = async () => {
  const fresh = cache.rows && Date.now() - cache.loadedAt < CACHE_TTL_MS;
  if (fresh) return cache.rows;
  if (!cache.loading) {
    cache.loading = loadCodes()
      .then((rows) => Object.assign(cache, { rows, loadedAt: Date.now() }).rows)
      .finally(() => {
        cache.loading = null;
      });
  }
  // Stale copy: keep answering from it while the reload runs.
  if (cache.rows) {
    cache.loading.catch(() => {});
    return cache.rows;
  }
  return cache.loading;
};

// Called at server start so the first search doesn't wait for the load.
const warmCodeCache = async () => (await getCodeRows()).length;

const ADD_ON_RE = new RegExp(escapeRegex(ADD_ON_TEXT).toLowerCase());

const searchCodes = async ({ q, system, filter, limit = CODE_LIMITS.search.default }) => {
  const rows = await getCodeRows();
  const ql = q.toLowerCase().trim();
  const query = { ql, qcode: ql.replace(/\./g, ''), terms: ql.split(/\s+/).filter(Boolean) };

  let systems = system?.length ? system : null;
  if (filter === CODE_FILTERS.EXTERNAL_CAUSE) systems = [CODE_SYSTEMS.ICD10CM];
  if (filter === CODE_FILTERS.ADD_ON) systems = [CODE_SYSTEMS.CPT];

  const scored = [];
  for (const row of rows) {
    if (systems && !systems.includes(row.system)) continue;
    if (filter === CODE_FILTERS.EXTERNAL_CAUSE && !/^[VWXY]/.test(row.rawDisplay)) continue;
    if (filter === CODE_FILTERS.ADD_ON && !ADD_ON_RE.test(row.description)) continue;
    const score = scoreRow(row, query);
    if (score !== null) scored.push([score, row.descLength, row]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].seq - b[2].seq);
  return { results: scored.slice(0, limit).map(([, , row]) => row.row), totalResults: scored.length };
};

const getCode = async (system, code) => {
  const doc = await Code.findById(`${system}:${stripCode(code)}`).lean();
  if (!doc) throw new ApiError(httpStatus.NOT_FOUND, 'Code not found');
  return toRow(doc);
};

// Every ICD-10-CM code under a category / subcategory stem (e.g. S52.5 -> S525, S5250, ...), sorted by code.
const getFamily = async (stem) => {
  const prefix = stripCode(stem);
  if (prefix.length < CODE_LIMITS.familyStemMin) {
    throw new ApiError(httpStatus.BAD_REQUEST, `The stem must have at least ${CODE_LIMITS.familyStemMin} characters`);
  }
  const docs = await Code.find({ system: CODE_SYSTEMS.ICD10CM, code: new RegExp(`^${escapeRegex(prefix)}`) })
    .select(CODE_FIELDS)
    .sort({ code: 1 })
    .lean();
  return { stem: prefix, results: docs.map(toRow), totalResults: docs.length };
};

// { code: true | false } for each code. Modifiers (25, LT ...) are always valid.
const validateCodes = async (codes) => {
  const keys = codes.map(stripCode);
  const found = await Code.distinct('code', { code: { $in: keys.filter((k) => k && !MODIFIER.test(k)) } });
  const known = new Set(found);
  return Object.fromEntries(codes.map((c, i) => [c, Boolean(keys[i]) && (MODIFIER.test(keys[i]) || known.has(keys[i]))]));
};

// ---------- Tabular notes ----------

// Notes for a code and every level above it: J45.21 -> J45.21, J45.2, J45 (closest first).
const getNotes = async (code) => {
  const c = String(code).trim().toUpperCase().replace(/-$/, '');
  const cands = [c];
  if (c.includes('.')) {
    const [head, tail] = c.split('.');
    for (let i = tail.length - 1; i >= 1; i--) cands.push(`${head}.${tail.slice(0, i)}`);
    cands.push(head);
  } else {
    for (let i = c.length - 1; i >= 3; i--) cands.push(c.slice(0, i));
  }
  const docs = await IcdNote.find({ _id: { $in: cands } }).lean();
  const byCode = new Map(docs.map((d) => [d._id, d]));
  const results = cands
    .filter((k) => byCode.has(k))
    .map((k) => {
      const { _id, ...notes } = byCode.get(k);
      return { code: k, notes, self: k === c }; // same items as the frontend's notesFor()
    });
  return { code: c, results };
};

// ---------- Alphabetic Index ----------

const findTerms = (match, limit) => IcdIndexTerm.find(match).select(INDEX_NODE).sort({ seq: 1 }).limit(limit).lean();

// Main terms whose normalized text starts with the query come first, then those containing it.
const searchIndex = async (index, q) => {
  const totalTerms = await IcdIndexTerm.countDocuments({ index });
  const t = (q || '').trim().toLowerCase();
  if (!t) {
    const results = await findTerms({ index }, CODE_LIMITS.indexBrowse);
    return { results, totalResults: results.length, totalTerms };
  }
  const max = CODE_LIMITS.indexSearch;
  const prefix = new RegExp(`^${escapeRegex(t)}`);
  const starts = await findTerms({ index, norm: prefix }, max);
  const rest =
    starts.length < max ? await findTerms({ index, norm: { $regex: escapeRegex(t), $not: prefix } }, max - starts.length) : [];
  const results = starts.concat(rest);
  return { results, totalResults: results.length, totalTerms };
};

// Follow a "see" / "see also" reference such as "Fracture, traumatic, radius" to its main term and
// the sub-terms to open. `open` holds the path keys ("0", "0.3", ...) the frontend tree uses.
const resolveIndexRef = async (index, ref) => {
  const r = normalizeTerm(ref);
  const all = await IcdIndexTerm.find({ index }).select('norm').sort({ seq: 1 }).lean();
  const map = new Map();
  all.forEach((d) => !map.has(d.norm) && map.set(d.norm, d._id)); // first occurrence wins
  const titles = [...map.keys()].sort((a, b) => b.length - a.length); // longest match first

  let best = null;
  let rest = '';
  if (map.has(r)) best = r;
  else {
    best = titles.find((t) => r.startsWith(`${t} `) || r.startsWith(`${t},`)) || null;
    if (best) rest = r.slice(best.length).replace(/^[\s,]+/, '');
  }
  if (!best) {
    // First-word fallback: "Fracture, radius..." -> "fracture, traumatic"
    const w = r.split(',')[0].split(' ')[0];
    if (map.has(w)) best = w;
    else if (map.has(`${w}, traumatic`)) best = `${w}, traumatic`;
    else {
      const c = titles.filter((t) => t === w || t.startsWith(`${w},`) || t.startsWith(`${w} `));
      if (c.length) best = c.sort((a, b) => a.length - b.length)[0];
    }
    if (best) {
      if (r.startsWith(best)) rest = r.slice(best.length).replace(/^[\s,]+/, '');
      else rest = r.includes(',') ? r.slice(r.indexOf(',') + 1).trim() : '';
    }
  }
  if (!best) return { found: false, ref, term: null, rest: '', open: [] };

  const term = await IcdIndexTerm.findById(map.get(best)).select(INDEX_NODE).lean();
  const open = [];
  let node = term;
  let pathKey = '';
  for (const s of rest.split(',').map((x) => x.trim()).filter(Boolean)) {
    const kids = node.d || [];
    let k = kids.findIndex((n) => normalizeTerm(n.t) === s);
    if (k < 0) k = kids.findIndex((n) => normalizeTerm(n.t).startsWith(s));
    if (k < 0) k = kids.findIndex((n) => normalizeTerm(n.t).includes(s));
    if (k < 0) break;
    pathKey = pathKey ? `${pathKey}.${k}` : String(k);
    open.push(pathKey);
    node = kids[k];
  }
  return { found: true, ref, term, rest, open };
};

// ---------- Neoplasm / Drug tables ----------

const searchTable = async (table, q) => {
  const totalRows = await IcdTableRow.countDocuments({ table });
  const t = (q || '').trim();
  const find = (match, limit) =>
    IcdTableRow.find({ table, ...match }).select({ _id: 0, seq: 1, t: 1, l: 1, c: 1, path: 1 }).sort({ seq: 1 }).limit(limit).lean();
  let docs;
  if (!t) docs = await find({}, CODE_LIMITS.tableBrowse);
  else {
    const max = CODE_LIMITS.tableSearch;
    const prefix = new RegExp(`^${escapeRegex(t)}`, 'i');
    const starts = await find({ t: prefix }, max);
    const rest = starts.length < max ? await find({ t: { $regex: escapeRegex(t), $options: 'i', $not: prefix } }, max - starts.length) : [];
    docs = starts.concat(rest);
  }
  // Same items the frontend built: { r: row, i: its position in the table }, plus `path` (the rows it is
  // indented under), which the frontend used to work out from the whole table it had in memory.
  const results = docs.map(({ seq, path, ...r }) => ({ r, i: seq, path }));
  return { columns: ICD_TABLE_META[table].columns, results, totalResults: results.length, totalRows };
};

module.exports = {
  warmCodeCache,
  getMeta,
  searchCodes,
  getCode,
  getFamily,
  validateCodes,
  getNotes,
  searchIndex,
  resolveIndexRef,
  searchTable,
};
