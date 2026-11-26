const mongoose = require('mongoose');
const { AuditLog, User, Chart, ChartUpload, ChartWork, Department } = require('../models');
const { AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_LIMITS: L } = require('../config/auditLog');
const { escapeRegex } = require('../utils/codeText');

// ---------- Audit log ----------
// record() is called by the admin controllers after a change succeeds. It never throws: a failed
// log write is reported on the server console and the admin's action still goes through.

// A readable name for the thing that was changed, looked up when the caller did not pass one.
const LABELS = {
  student: async (id) => {
    const s = await User.findById(id).select('name email studentId').lean();
    return s ? `${s.name || s.email}${s.studentId ? ' (' + s.studentId + ')' : ''}` : '';
  },
  auditor: async (id) => {
    const a = await User.findById(id).select('name email').lean();
    return a ? a.name || a.email : '';
  },
  chart: async (id) => {
    const c = await Chart.findById(id).select('title').lean();
    return c ? `${id}${c.title ? ' — ' + c.title : ''}` : String(id);
  },
  upload: async (id) => {
    const u = await ChartUpload.findById(id).select('title chart').lean();
    return u ? [u.chart, u.title].filter(Boolean).join(' — ') : '';
  },
  department: async (id) => {
    const d = await Department.findById(id).select('name').lean();
    return d ? `${d.name} (${id})` : String(id);
  },
  work: async (id) => {
    const w = await ChartWork.findById(id).select('student chart').populate('student', 'name email studentId').lean();
    if (!w) return '';
    const s = w.student || {};
    return `${w.chart} · ${s.name || s.email || 'student'}${s.studentId ? ' (' + s.studentId + ')' : ''}`;
  },
};

const clip = (text, n) => String(text || '').slice(0, n);

const record = async (actor, action, { target = {}, summary = '', details = null } = {}) => {
  try {
    const def = AUDIT_ACTIONS[action];
    if (!def) throw new Error(`Unknown audit action ${action}`);
    if (!actor || !actor._id) throw new Error('Audit entry without an actor');
    const t = { type: target.type || '', id: target.id != null ? String(target.id) : '', label: target.label || '' };
    if (!t.label && t.id && LABELS[t.type]) t.label = await LABELS[t.type](t.id).catch(() => '');
    await AuditLog.create({
      at: new Date(),
      actor: actor._id,
      actorName: actor.name || actor.email || '',
      actorRole: actor.role || '',
      action,
      category: def.category,
      target: { ...t, label: clip(t.label, 200) },
      summary: clip(summary, L.summary),
      details,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] could not record', action, err.message);
  }
};

// Look up a label now (e.g. before a delete removes the record it comes from).
const labelOf = async (type, id) => (LABELS[type] ? LABELS[type](id).catch(() => '') : '');

// Audit Log page: category tab, admin, action, date range, search; newest first, paged.
const queryLogs = async ({ category = 'all', actor, action, from, to, search, page = 1, limit = L.defaultLimit }) => {
  const match = {};
  if (actor) match.actor = new mongoose.Types.ObjectId(String(actor));
  if (action) match.action = action;
  if (from || to) {
    match.at = {};
    if (from) match.at.$gte = new Date(from);
    if (to) match.at.$lt = new Date(new Date(to).getTime() + 24 * 3600 * 1000); // whole "to" day
  }
  const term = (search || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    match.$or = [{ 'target.label': rx }, { 'target.id': rx }, { summary: rx }, { actorName: rx }];
  }
  const rowMatch = category && category !== 'all' ? { ...match, category } : match;

  const [rows, totalResults, counts, actors] = await Promise.all([
    AuditLog.find(rowMatch)
      .sort({ at: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(rowMatch),
    AuditLog.aggregate([{ $match: match }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
    AuditLog.aggregate([{ $group: { _id: '$actor', name: { $last: '$actorName' }, n: { $sum: 1 } } }, { $sort: { name: 1 } }]),
  ]);
  const countOf = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const all = counts.reduce((n, c) => n + c.n, 0);
  return {
    results: rows.map((r) => ({
      id: String(r._id),
      at: r.at,
      actor: { id: String(r.actor), name: r.actorName || 'Unknown', role: r.actorRole },
      action: r.action,
      actionLabel: (AUDIT_ACTIONS[r.action] || {}).label || r.action,
      category: r.category,
      target: r.target || {},
      summary: r.summary || '',
      details: r.details || null,
    })),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
    filters: [{ key: 'all', label: 'All', count: all }, ...AUDIT_CATEGORIES.map((c) => ({ key: c.key, label: c.label, count: countOf[c.key] || 0 }))],
    actors: actors.map((a) => ({ value: String(a._id), label: a.name || 'Unknown', count: a.n })),
    actions: Object.entries(AUDIT_ACTIONS).map(([value, a]) => ({ value, label: a.label, category: a.category })),
  };
};

module.exports = { record, labelOf, queryLogs };
