const { Allocation, Chart, ChartResult, ChartWork, Code, Department } = require('../models');
const { CHARGE_SESSION, WORK_LIMITS, WORK_STATUS, WORK_TYPES } = require('../config/workQueue');
const { CODE_SYSTEMS } = require('../config/codes');
const { DX_CLASS_LABELS, encounterProfile } = require('../config/encounter');
const { checkDiagnoses, norm: normCode } = require('../utils/diagnosis');
const referenceService = require('./reference.service');
const counterService = require('./counter.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { gradeWork, toSaved } = require('../utils/gradeWork');
const certificateService = require('./certificate.service');

// ---------- Student chart work: autosave, defer, transfer, physician query, comments, submit ----------
// Every call is scoped to the signed-in student and to charts inside their allocated range.

const DUPLICATE_KEY = 11000;
const MAX_TIME_SPENT = 24 * 60 * 60; // seconds

// The chart if it is in the student's allocation for this department (404 otherwise).
const findChart = async (student, deptKey, chartId, select = '_id dept deptName position workType') => {
  const filter = { _id: chartId };
  if (deptKey) filter.dept = deptKey;
  const chart = await Chart.findOne(filter).select(select).lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found in your allocation');
  const allocation = await Allocation.findOne({ student: student._id, dept: chart.dept }).select('start end').lean();
  if (!allocation || chart.position < allocation.start || chart.position > allocation.end) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found in your allocation');
  }
  return chart;
};

const activity = (kind, text) => ({ at: new Date(), kind, text: String(text).slice(0, 300) });

// Upserts the student's work row and applies `update`. Retries once on a double-create race.
const upsertWork = async (student, chart, update) => {
  const filter = { student: student._id, chart: chart._id };
  const run = () =>
    ChartWork.findOneAndUpdate(filter, { ...update, $setOnInsert: { student: student._id, chart: chart._id, dept: chart.dept, ...(update.$setOnInsert || {}) } }, {
      upsert: true,
      returnDocument: 'after',
      lean: true,
    });
  try {
    return await run();
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
    return run();
  }
};
// When a query was answered, or null while it is pending. Older auto-answered rows count from `answerAt`.
const answeredAtOf = (q, now = Date.now()) => {
  if (q.answeredAt) return q.answeredAt;
  if (q.answerAt && q.answer && new Date(q.answerAt).getTime() <= now) return q.answerAt;
  return null;
};
const hasPendingQuery = (work) => Boolean(work && (work.queries || []).some((q) => !answeredAtOf(q)));

const pushActivity = (entry) => ({ $push: { activity: { $each: [entry], $slice: -WORK_LIMITS.activity } } });

// The work row as the workspace sees it. A query's answer appears once an admin has answered it.
const toClientWork = (work) => {
  if (!work) return { status: null, draft: null, timeSpent: 0, queries: [], activity: [], defer: null, transfer: null, submittedAt: null, session: null };
  const now = Date.now();
  return {
    status: work.status,
    draft: work.draft || null,
    savedAt: work.updatedAt || null, // when the server last stored the draft (device-copy recovery compares against it)
    timeSpent: work.timeSpent || 0,
    defer: work.defer && work.defer.reason ? work.defer : null,
    transfer: work.transfer && work.transfer.queue ? work.transfer : null,
    submittedAt: work.submittedAt || null,
    session: work.session || null,
    queries: (work.queries || []).map((q) => {
      const answeredAt = answeredAtOf(q, now);
      const answered = Boolean(answeredAt);
      return {
        id: String(q._id),
        to: q.to,
        indicators: q.indicators,
        question: q.question,
        options: q.options,
        sentAt: q.sentAt,
        answered,
        answeredAt,
        answer: answered ? q.answer : '',
      };
    }),
    activity: (work.activity || []).slice(-50),
  };
};

const getWork = async (student, deptKey, chartId) => {
  await findChart(student, deptKey, chartId);
  return toClientWork(await ChartWork.findOne({ student: student._id, chart: chartId }).lean());
};

// ---- diagnosis activity: what changed in the diagnosis list between two autosaves ----
const DX_ACTIVITY_MAX = 6; // entries per save; more changes are summarised in one entry
const clsName = (c) => (DX_CLASS_LABELS[c] || 'Unclassified').replace(' diagnosis', '').toLowerCase();
const dxChanges = (before = [], after = []) => {
  const prev = new Map(before.filter((d) => d && d.id).map((d) => [d.id, d]));
  const next = new Map(after.filter((d) => d && d.id).map((d) => [d.id, d]));
  const out = [];
  after.forEach((d, i) => {
    const p = prev.get(d.id);
    if (!p) out.push(`Diagnosis added: ${d.code} (${clsName(d.cls)}, #${i + 1})`);
    else {
      if (p.code !== d.code) out.push(`Diagnosis updated: ${p.code} → ${d.code}`);
      if ((p.cls || '') !== (d.cls || '')) out.push(`Diagnosis classification changed: ${d.code} ${clsName(p.cls)} → ${clsName(d.cls)}`);
    }
  });
  before.forEach((p) => !next.has(p.id) && out.push(`Diagnosis deleted: ${p.code}`));
  const keptBefore = before.filter((d) => next.has(d.id)).map((d) => d.id);
  const keptAfter = after.filter((d) => prev.has(d.id)).map((d) => d.id);
  if (keptBefore.join('|') !== keptAfter.join('|')) out.push(`Diagnosis sequence changed: ${after.map((d, i) => `${i + 1}. ${d.code}`).join(', ')}`);
  return out;
};
const dxActivity = (student, before, after) => {
  const changes = dxChanges(before || [], after || []);
  if (!changes.length) return [];
  const entries = changes.length > DX_ACTIVITY_MAX ? [`${changes.length} diagnosis changes: ${changes.join('; ')}`] : changes;
  return entries.map((text) => ({ ...activity('dx', text), by: student._id }));
};

// Autosave. Opening a deferred or transferred chart and changing it puts it back in progress.
// Diagnosis changes (added, updated, deleted, reclassified, re-sequenced) go into the activity log.
const saveDraft = async (student, deptKey, chartId, { draft, timeSpent }) => {
  const chart = await findChart(student, deptKey, chartId);
  const existing = await ChartWork.findOne({ student: student._id, chart: chartId }).select('status timeSpent draft.dx').lean();
  const set = { draft };
  if (timeSpent != null) set.timeSpent = Math.min(MAX_TIME_SPENT, Math.max(existing ? existing.timeSpent || 0 : 0, timeSpent));
  const update = { $set: set };
  const entries = [];
  if (!existing) entries.push(activity('opened', 'Started working this chart'));
  else if (existing.status === WORK_STATUS.DEFERRED || existing.status === WORK_STATUS.TRANSFERRED) {
    set.status = WORK_STATUS.IN_PROGRESS;
    entries.push(activity('resume', 'Resumed from ' + existing.status));
  }
  entries.push(...dxActivity(student, existing && existing.draft && existing.draft.dx, draft.dx));
  if (entries.length) update.$push = { activity: { $each: entries, $slice: -WORK_LIMITS.activity } };
  const work = await upsertWork(student, chart, update);
  return { status: work.status, timeSpent: work.timeSpent, savedAt: work.updatedAt };
};

const deferChart = async (student, deptKey, chartId, { reason, comment = '', draft, timeSpent }) => {
  const chart = await findChart(student, deptKey, chartId);
  if (!(await referenceService.hasValue('deferReasons', reason))) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a defer reason');
  const set = { status: WORK_STATUS.DEFERRED, defer: { reason, comment, at: new Date() } };
  if (draft) set.draft = draft;
  if (timeSpent != null) set.timeSpent = Math.min(MAX_TIME_SPENT, timeSpent);
  const work = await upsertWork(student, chart, { $set: set, ...pushActivity(activity('defer', `Deferred — ${reason}${comment ? ': ' + comment : ''}`)) });
  return toClientWork(work);
};

const transferChart = async (student, deptKey, chartId, { queue, reason, comment, draft, timeSpent }) => {
  const chart = await findChart(student, deptKey, chartId);
  if (!(await referenceService.hasValue('transferQueues', queue))) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a work queue');
  if (!(await referenceService.hasValue('transferReasons', reason))) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a transfer reason');
  const set = { status: WORK_STATUS.TRANSFERRED, transfer: { queue, reason, comment, at: new Date() } };
  if (draft) set.draft = draft;
  if (timeSpent != null) set.timeSpent = Math.min(MAX_TIME_SPENT, timeSpent);
  const work = await upsertWork(student, chart, { $set: set, ...pushActivity(activity('transfer', `Transferred to ${queue} — ${reason}: ${comment}`)) });
  return toClientWork(work);
};

// A physician query: the chart is on hold until an admin answers it (Physician Queries page).
const sendQuery = async (student, deptKey, chartId, { to, indicators = '', question, options = [] }) => {
  const chart = await findChart(student, deptKey, chartId, '_id dept deptName position');
  const existing = await ChartWork.findOne({ student: student._id, chart: chartId }).select('queries').lean();
  if (existing && existing.queries.length >= WORK_LIMITS.queries) throw new ApiError(httpStatus.BAD_REQUEST, 'Too many queries on this chart');
  const query = { to, indicators, question, options, sentAt: new Date(), answer: '', answeredAt: null };
  const work = await upsertWork(student, chart, { $push: { queries: query, activity: { $each: [activity('query', `Physician query sent to ${to}`)], $slice: -WORK_LIMITS.activity } } });
  return toClientWork(work);
};

// Denial: accepting the charge correction opens a pending session. One number per student and chart.
const openSession = async (student, deptKey, chartId) => {
  const chart = await findChart(student, deptKey, chartId, '_id dept deptName position workType');
  if (chart.workType !== WORK_TYPES.DENIAL) throw new ApiError(httpStatus.BAD_REQUEST, 'Only denials have a charge-correction session');
  const existing = await ChartWork.findOne({ student: student._id, chart: chartId }).select('session').lean();
  if (existing && existing.session) return toClientWork(await ChartWork.findOne({ student: student._id, chart: chartId }).lean());
  const seq = await counterService.nextSequence(CHARGE_SESSION.counter);
  const session = CHARGE_SESSION.prefix + String(seq).padStart(CHARGE_SESSION.digits, '0');
  const work = await upsertWork(student, chart, { $set: { session }, ...pushActivity(activity('session', `Charge correction accepted — session ${session} pending`)) });
  return toClientWork(work);
};

const addComment = async (student, deptKey, chartId, { text }) => {
  const chart = await findChart(student, deptKey, chartId);
  const work = await upsertWork(student, chart, pushActivity(activity('comment', text)));
  return toClientWork(work);
};

// Submit: the server grades the work against the answer key (the browser never has it),
// saves the score (one per student and chart), marks the work done and issues a certificate if earned.
// The ICD-10-CM codes of a diagnosis list found in the code set: Map(normalised code -> { billable }).
const lookupDxCodes = async (dx) => {
  const codes = [...new Set((dx || []).map((d) => normCode(d.code)).filter(Boolean))];
  if (!codes.length) return new Map();
  const rows = await Code.find({ system: CODE_SYSTEMS.ICD10CM, code: { $in: codes } }).select('code billable').lean();
  return new Map(rows.map((r) => [normCode(r.code), { billable: r.billable }]));
};

// Diagnosis rules a submission must pass (utils/diagnosis.js), against the chart's own encounter type.
// A denial that is appealed or written off sends the billed claim as it is, so it is not re-checked.
// eslint-disable-next-line no-unused-vars
const assertDiagnoses = async (chart, profile, submission) => {
  if (chart.workType === WORK_TYPES.DENIAL && submission.decision !== 'correct') return;
  const issues = checkDiagnoses(submission.dx, { encounterType: profile.encounterType, lookup: await lookupDxCodes(submission.dx) });
  if (issues.length) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Fix the diagnosis errors before submitting', issues.map((i) => ({ field: 'dx', rule: i.rule, code: i.code, message: i.message })));
  }
};

const submitWork = async (student, chartId, submission) => {
  const chart = await Chart.findById(chartId).select('dept deptName position answerKey keyMeta workType encounterType billingType').lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found');
  await findChart(student, chart.dept, chartId);
  const work = await ChartWork.findOne({ student: student._id, chart: chartId }).select('queries').lean();
  if (hasPendingQuery(work)) throw new ApiError(httpStatus.CONFLICT, 'A physician query is still pending on this chart');

  const department = await Department.findById(chart.dept).select('elements').lean();
  // Encounter type from the chart record (or, for older charts, its department) — never from the request.
  const profile = encounterProfile(chart, (department && department.elements) || []);
  // Students may submit with open errors: wrong or missing codes cost marks in gradeWork instead of blocking.
  // assertDiagnoses is kept but no longer called (only a pending physician query blocks a submit).
  const result = gradeWork({ ...chart, profile, isInpatient: profile.facilityIP, workType: chart.workType || WORK_TYPES.CODE }, submission);
  const saved = toSaved(result, chart.dept, Date.now());
  // Kept for the auditor; replacing the row also drops any audit of the previous submission.
  const { draft, timeSpent, ...graded } = submission;

  const filter = { student: student._id, chart: chart._id };
  const write = () => ChartResult.findOneAndReplace(filter, { ...filter, ...saved, submission: graded, checks: result.checks }, { upsert: true });
  try {
    await write();
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
    await write();
  }
  const set = { status: WORK_STATUS.DONE, submittedAt: new Date() };
  if (submission.draft) set.draft = submission.draft;
  if (submission.timeSpent != null) set.timeSpent = Math.min(MAX_TIME_SPENT, submission.timeSpent);
  await upsertWork(student, chart, { $set: set, ...pushActivity(activity('submit', `Submitted — ${result.accuracy}%`)) });

  const certificate = await certificateService.issueIfEarned(student, chart.dept, chart.deptName);
  return { result, saved, certificate };
};

module.exports = { dxChanges, answeredAtOf, hasPendingQuery, toClientWork, getWork, saveDraft, deferChart, transferChart, sendQuery, openSession, addComment, submitWork, findChart };
