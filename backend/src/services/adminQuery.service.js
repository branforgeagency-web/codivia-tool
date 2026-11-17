const mongoose = require('mongoose');
const { Chart, ChartWork, User } = require('../models');
const { QUERY_STATUS } = require('../config/workQueue');
const { ROLES } = require('../config/roles');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');
const { answeredAtOf } = require('./chartWork.service');

// ---------- Admin: Physician Queries ----------
// Students send CDI queries from the chart workspace; the chart stays on hold until an admin answers
// here. There is no automatic reply. The chart's cdiResponse is offered only as a suggested answer.

const { ObjectId } = mongoose.Types;

// After $unwind: '$queries'. Pending = no answeredAt and not an old auto-answered row (answerAt passed).
const pendingMatch = (now) => ({
  'queries.answeredAt': null,
  $or: [{ 'queries.answerAt': null }, { 'queries.answerAt': { $gt: now } }],
});
const answeredMatch = (now) => ({ $nor: [pendingMatch(now)] });

// Queries of students who still exist (soft-deleted students drop out of the list and the count).
const baseStages = () => [
  { $match: { 'queries.0': { $exists: true } } },
  { $unwind: '$queries' },
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

// Badge in the admin sidebar.
const countPending = async () => {
  const [row] = await ChartWork.aggregate([...baseStages(), { $match: pendingMatch(new Date()) }, { $count: 'n' }]);
  return { pending: row ? row.n : 0 };
};

// The list: status tab (pending | answered | all), search, pages, and the tab counts.
// Pending: oldest first (first in, first answered). Answered / all: newest first.
const queryQueries = async ({ status = QUERY_STATUS.PENDING, search, page = 1, limit = 10 }) => {
  const now = new Date();
  const stages = [
    ...baseStages(),
    {
      $lookup: {
        from: Chart.collection.name,
        localField: 'chart',
        foreignField: '_id',
        pipeline: [{ $project: { title: 1, dept: 1, deptName: 1, workType: 1, position: 1, cdiResponse: 1 } }],
        as: 'chartDoc',
      },
    },
    { $unwind: { path: '$chartDoc', preserveNullAndEmptyArrays: true } },
  ];
  const term = (search || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    stages.push({
      $match: {
        $or: [
          { 'studentDoc.name': rx },
          { 'studentDoc.email': rx },
          { 'studentDoc.studentId': rx },
          { chart: rx },
          { 'chartDoc.title': rx },
          { 'queries.to': rx },
          { 'queries.question': rx },
        ],
      },
    });
  }
  const statusMatch = status === QUERY_STATUS.PENDING ? pendingMatch(now) : status === QUERY_STATUS.ANSWERED ? answeredMatch(now) : {};
  const sort = status === QUERY_STATUS.PENDING ? { 'queries.sentAt': 1, _id: 1 } : { 'queries.sentAt': -1, _id: -1 };

  const [out] = await ChartWork.aggregate([
    ...stages,
    {
      $facet: {
        pending: [{ $match: pendingMatch(now) }, { $count: 'n' }],
        answered: [{ $match: answeredMatch(now) }, { $count: 'n' }],
        rows: [{ $match: statusMatch }, { $sort: sort }, { $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $match: statusMatch }, { $count: 'n' }],
      },
    },
  ]);
  const n = (arr) => (arr && arr[0] ? arr[0].n : 0);
  const totalResults = n(out.total);

  // Names of the admins who answered (one query for the page).
  const answererIds = [...new Set(out.rows.map((r) => r.queries.answeredBy).filter(Boolean).map(String))];
  const answerers = answererIds.length ? await User.find({ _id: { $in: answererIds } }).select('name email').lean() : [];
  const nameOf = new Map(answerers.map((u) => [String(u._id), u.name || u.email]));

  const results = out.rows.map((r) => {
    const q = r.queries;
    const answeredAt = answeredAtOf(q, now.getTime());
    const s = r.studentDoc;
    const c = r.chartDoc || {};
    return {
      workId: String(r._id),
      queryId: String(q._id),
      status: answeredAt ? QUERY_STATUS.ANSWERED : QUERY_STATUS.PENDING,
      to: q.to,
      indicators: q.indicators || '',
      question: q.question,
      options: q.options || [],
      sentAt: q.sentAt,
      answer: answeredAt ? q.answer || '' : '',
      answeredAt,
      answeredBy: q.answeredBy ? nameOf.get(String(q.answeredBy)) || 'Admin' : answeredAt ? 'Automatic (old)' : null,
      student: { uid: String(s._id), id: s.studentId || String(s._id), name: s.name || s.email, email: s.email, disabled: s.status === 'disabled' },
      chart: { id: r.chart, title: c.title || '', dept: c.dept || r.dept, deptName: c.deptName || c.dept || r.dept, workType: c.workType || 'code', position: c.position },
      suggestedAnswer: c.cdiResponse || '',
    };
  });

  return {
    results,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
    filters: [
      { key: QUERY_STATUS.PENDING, label: 'Pending', count: n(out.pending) },
      { key: QUERY_STATUS.ANSWERED, label: 'Answered', count: n(out.answered) },
      { key: 'all', label: 'All', count: n(out.pending) + n(out.answered) },
    ],
  };
};

// Answer one pending query. The student's workspace picks it up on its next poll: the chart comes
// off hold and a "Query Response" document appears.
const answerQuery = async (workId, queryId, answer, admin) => {
  const work = await ChartWork.findById(workId).select('queries student').lean();
  const q = work && work.queries.find((x) => String(x._id) === String(queryId));
  if (!q) throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  if (answeredAtOf(q)) throw new ApiError(httpStatus.CONFLICT, 'This query has already been answered');

  const at = new Date();
  const res = await ChartWork.updateOne(
    { _id: workId, queries: { $elemMatch: { _id: new ObjectId(String(queryId)), answeredAt: null } } },
    {
      $set: { 'queries.$.answer': answer, 'queries.$.answeredAt': at, 'queries.$.answeredBy': admin._id },
      $push: { activity: { $each: [{ at, kind: 'answer', text: `Physician query answered — ${q.to}`.slice(0, 300) }], $slice: -200 } },
    }
  );
  if (!res.modifiedCount) throw new ApiError(httpStatus.CONFLICT, 'This query has already been answered');
  return { queryId: String(queryId), status: QUERY_STATUS.ANSWERED, answer, answeredAt: at };
};

module.exports = { countPending, queryQueries, answerQuery };
