const mongoose = require('mongoose');
const { ChartResult, ChartWork, Chart, User } = require('../models');
const { ROLES } = require('../config/roles');
const { WORK_STATUS, ADMIN_WORK_LIMITS: L } = require('../config/workQueue');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');
const { answeredAtOf } = require('./chartWork.service');

// ---------- Admin: Chart Activity ----------
// What students do inside charts (ChartWork): in progress, deferred (with reason), transferred to a
// work queue (with queue, reason, comment), submitted; their physician queries, comments and the
// activity timeline. The admin can send a deferred / transferred chart back to the student and leave
// notes; both show up in the student's Activity panel in the workspace.

const { ObjectId } = mongoose.Types;

// Tabs. "attention" = deferred + transferred: work that is waiting on someone.
const TABS = Object.freeze([
  { key: 'attention', label: 'Needs attention', statuses: [WORK_STATUS.DEFERRED, WORK_STATUS.TRANSFERRED] },
  { key: WORK_STATUS.DEFERRED, label: 'Deferred', statuses: [WORK_STATUS.DEFERRED] },
  { key: WORK_STATUS.TRANSFERRED, label: 'Transferred', statuses: [WORK_STATUS.TRANSFERRED] },
  { key: WORK_STATUS.IN_PROGRESS, label: 'In progress', statuses: [WORK_STATUS.IN_PROGRESS] },
  { key: WORK_STATUS.DONE, label: 'Completed', statuses: [WORK_STATUS.DONE] },
  { key: 'all', label: 'All', statuses: null },
]);
const WAITING = [WORK_STATUS.DEFERRED, WORK_STATUS.TRANSFERRED];

// Work of students who still exist (soft-deleted students drop out).
const studentStages = () => [
  {
    $lookup: {
      from: User.collection.name,
      localField: 'student',
      foreignField: '_id',
      pipeline: [{ $match: { role: ROLES.STUDENT, deletedAt: null } }, { $project: { name: 1, email: 1, studentId: 1, status: 1 } }],
      as: 'studentDoc',
    },
  },
  { $unwind: '$studentDoc' },
];

// Sidebar badge: charts waiting on someone (deferred + transferred).
const summary = async () => {
  const rows = await ChartWork.aggregate([{ $match: { status: { $in: WAITING } } }, ...studentStages(), { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const n = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const deferred = n[WORK_STATUS.DEFERRED] || 0;
  const transferred = n[WORK_STATUS.TRANSFERRED] || 0;
  return { deferred, transferred, attention: deferred + transferred };
};

const tail = (arr, n) => (arr || []).slice(-n);

// One work row as the page shows it.
const toRow = (r, now) => {
  const s = r.studentDoc;
  const c = r.chartDoc || {};
  const queries = r.queries || [];
  const activity = r.activity || [];
  const waitingSince = r.status === WORK_STATUS.DEFERRED ? r.defer && r.defer.at : r.status === WORK_STATUS.TRANSFERRED ? r.transfer && r.transfer.at : null;
  return {
    workId: String(r._id),
    status: r.status,
    student: { uid: String(s._id), id: s.studentId || String(s._id), name: s.name || s.email, email: s.email, disabled: s.status === 'disabled' },
    chart: { id: r.chart, title: c.title || '', dept: c.dept || r.dept, deptName: c.deptName || c.dept || r.dept, workType: c.workType || 'code', position: c.position },
    defer: r.defer && r.defer.reason ? { reason: r.defer.reason, comment: r.defer.comment || '', at: r.defer.at } : null,
    transfer: r.transfer && r.transfer.queue ? { queue: r.transfer.queue, reason: r.transfer.reason || '', comment: r.transfer.comment || '', at: r.transfer.at } : null,
    waitingSince,
    queries: { total: queries.length, pending: queries.filter((q) => !answeredAtOf(q, now)).length },
    comments: tail(activity.filter((a) => a.kind === 'comment'), L.comments),
    adminNotes: activity.filter((a) => a.kind === 'admin').length,
    activity: tail(activity, L.activity),
    timeSpent: r.timeSpent || 0,
    score: r.resultDoc ? r.resultDoc.accuracy : null,
    submittedAt: r.submittedAt || null,
    startedAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

// The list: tab, department, transfer queue, search, pages; tab counts, the queue and department
// choices and the statistics. Waiting tabs: oldest first (first in, first handled). Others: latest first.
const queryWork = async ({ status = 'attention', dept, queue, search, page = 1, limit = L.defaultLimit }) => {
  const now = Date.now();
  const tab = TABS.find((t) => t.key === status) || TABS[0];
  const base = [
    ...studentStages(),
    {
      $lookup: {
        from: Chart.collection.name,
        localField: 'chart',
        foreignField: '_id',
        pipeline: [{ $project: { title: 1, dept: 1, deptName: 1, workType: 1, position: 1 } }],
        as: 'chartDoc',
      },
    },
    { $unwind: { path: '$chartDoc', preserveNullAndEmptyArrays: true } },
  ];
  const term = (search || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    base.push({
      $match: {
        $or: [
          { 'studentDoc.name': rx },
          { 'studentDoc.email': rx },
          { 'studentDoc.studentId': rx },
          { chart: rx },
          { 'chartDoc.title': rx },
          { 'defer.reason': rx },
          { 'transfer.queue': rx },
          { 'transfer.reason': rx },
        ],
      },
    });
  }
  // The department filter applies to everything except the department choices themselves, so the
  // dropdown keeps listing every department.
  const deptMatch = dept ? [{ $match: { dept } }] : [];

  const rowMatch = {};
  if (tab.statuses) rowMatch.status = { $in: tab.statuses };
  if (queue) rowMatch['transfer.queue'] = queue;
  const waiting = tab.statuses && tab.statuses.every((x) => WAITING.includes(x));
  const sortStage = waiting
    ? [
        {
          $addFields: {
            waitAt: { $ifNull: [{ $cond: [{ $eq: ['$status', WORK_STATUS.TRANSFERRED] }, '$transfer.at', '$defer.at'] }, '$updatedAt'] },
          },
        },
        { $sort: { waitAt: 1, _id: 1 } },
      ]
    : [{ $sort: { updatedAt: -1, _id: -1 } }];

  const [out] = await ChartWork.aggregate([
    ...base,
    {
      $facet: {
        counts: [...deptMatch, { $group: { _id: '$status', n: { $sum: 1 } } }],
        queues: [...deptMatch, { $match: { status: WORK_STATUS.TRANSFERRED } }, { $group: { _id: '$transfer.queue', n: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        depts: [{ $group: { _id: '$dept', name: { $first: '$chartDoc.deptName' }, n: { $sum: 1 } } }, { $sort: { name: 1 } }],
        total: [...deptMatch, { $match: rowMatch }, { $count: 'n' }],
        rows: [
          ...deptMatch,
          { $match: rowMatch },
          ...sortStage,
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: ChartResult.collection.name,
              let: { s: '$student', c: '$chart' },
              pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$student', '$$s'] }, { $eq: ['$chart', '$$c'] }] } } }, { $project: { accuracy: 1 } }],
              as: 'resultDoc',
            },
          },
          { $unwind: { path: '$resultDoc', preserveNullAndEmptyArrays: true } },
        ],
      },
    },
  ]);

  const countOf = Object.fromEntries(out.counts.map((c) => [c._id, c.n]));
  const tabCount = (t) => (t.statuses ? t.statuses.reduce((n, x) => n + (countOf[x] || 0), 0) : out.counts.reduce((n, c) => n + c.n, 0));
  const totalResults = out.total[0] ? out.total[0].n : 0;
  return {
    results: out.rows.map((r) => toRow(r, now)),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
    filters: TABS.map((t) => ({ key: t.key, label: t.label, count: tabCount(t) })),
    queues: out.queues.filter((q) => q._id).map((q) => ({ value: q._id, label: q._id, count: q.n })),
    departments: out.depts.map((d) => ({ value: d._id, label: d.name || d._id, count: d.n })),
  };
};

const findWork = async (workId) => {
  const work = await ChartWork.findById(workId).select('status student chart').lean();
  if (!work) throw new ApiError(httpStatus.NOT_FOUND, 'Chart work not found');
  return work;
};
const adminName = (admin) => admin.name || admin.email || 'Admin';
const pushActivity = (text) => ({ $push: { activity: { $each: [{ at: new Date(), kind: 'admin', text: text.slice(0, 300) }], $slice: -200 } } });

// Send a deferred or transferred chart back to the student's To do list, with an optional note.
// The defer / transfer details stay on the record as history.
const returnToStudent = async (workId, { note = '' }, admin) => {
  const work = await findWork(workId);
  if (!WAITING.includes(work.status)) throw new ApiError(httpStatus.CONFLICT, 'Only deferred or transferred charts can be returned to the student');
  const text = `Returned to you by ${adminName(admin)}${note ? ': ' + note : ''}`;
  const res = await ChartWork.updateOne({ _id: workId, status: work.status }, { $set: { status: WORK_STATUS.IN_PROGRESS }, ...pushActivity(text) });
  if (!res.modifiedCount) throw new ApiError(httpStatus.CONFLICT, 'The chart changed in the meantime; reload and try again');
  return { workId: String(workId), status: WORK_STATUS.IN_PROGRESS };
};

// A note from the admin on the chart (shown in the student's Activity panel).
const addNote = async (workId, { text }, admin) => {
  await findWork(workId);
  await ChartWork.updateOne({ _id: new ObjectId(String(workId)) }, pushActivity(`Note from ${adminName(admin)}: ${text}`));
  return { workId: String(workId) };
};

module.exports = { TABS, summary, queryWork, returnToStudent, addNote };
