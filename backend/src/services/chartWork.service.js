const { Allocation, Chart, ChartResult, ChartWork, Department } = require('../models');
const { CHARGE_SESSION, DEFAULT_QUERY_ANSWER, QUERY_ANSWER_DELAY_MS, WORK_LIMITS, WORK_STATUS, WORK_TYPES } = require('../config/workQueue');
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
const pushActivity = (entry) => ({ $push: { activity: { $each: [entry], $slice: -WORK_LIMITS.activity } } });

// The work row as the workspace sees it. Query answers stay hidden until they are "returned".
const toClientWork = (work) => {
  if (!work) return { status: null, draft: null, timeSpent: 0, queries: [], activity: [], defer: null, transfer: null, submittedAt: null, session: null };
  const now = Date.now();
  return {
    status: work.status,
    draft: work.draft || null,
    timeSpent: work.timeSpent || 0,
    defer: work.defer && work.defer.reason ? work.defer : null,
    transfer: work.transfer && work.transfer.queue ? work.transfer : null,
    submittedAt: work.submittedAt || null,
    session: work.session || null,
    queries: (work.queries || []).map((q) => {
      const answered = new Date(q.answerAt).getTime() <= now;
      return {
        id: String(q._id),
        to: q.to,
        indicators: q.indicators,
        question: q.question,
        options: q.options,
        sentAt: q.sentAt,
        answered,
        answeredAt: answered ? q.answerAt : null,
        answer: answered ? q.answer : '',
        answerIn: answered ? 0 : Math.ceil((new Date(q.answerAt).getTime() - now) / 1000),
      };
    }),
    activity: (work.activity || []).slice(-50),
  };
};

const getWork = async (student, deptKey, chartId) => {
  await findChart(student, deptKey, chartId);
  return toClientWork(await ChartWork.findOne({ student: student._id, chart: chartId }).lean());
};

// Autosave. Opening a deferred or transferred chart and changing it puts it back in progress.
const saveDraft = async (student, deptKey, chartId, { draft, timeSpent }) => {
  const chart = await findChart(student, deptKey, chartId);
  const existing = await ChartWork.findOne({ student: student._id, chart: chartId }).select('status timeSpent').lean();
  const set = { draft };
  if (timeSpent != null) set.timeSpent = Math.min(MAX_TIME_SPENT, Math.max(existing ? existing.timeSpent || 0 : 0, timeSpent));
  const update = { $set: set };
  if (!existing) Object.assign(update, pushActivity(activity('opened', 'Started working this chart')));
  else if (existing.status === WORK_STATUS.DEFERRED || existing.status === WORK_STATUS.TRANSFERRED) {
    set.status = WORK_STATUS.IN_PROGRESS;
    Object.assign(update, pushActivity(activity('resume', 'Resumed from ' + existing.status)));
  }
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

// A physician query: the chart is effectively on hold until the (simulated) answer comes back.
const sendQuery = async (student, deptKey, chartId, { to, indicators = '', question, options = [] }) => {
  const chart = await findChart(student, deptKey, chartId, '_id dept deptName position cdiResponse');
  const existing = await ChartWork.findOne({ student: student._id, chart: chartId }).select('queries').lean();
  if (existing && existing.queries.length >= WORK_LIMITS.queries) throw new ApiError(httpStatus.BAD_REQUEST, 'Too many queries on this chart');
  const now = Date.now();
  const query = { to, indicators, question, options, sentAt: new Date(now), answerAt: new Date(now + QUERY_ANSWER_DELAY_MS), answer: chart.cdiResponse || DEFAULT_QUERY_ANSWER };
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
const submitWork = async (student, chartId, submission) => {
  const chart = await Chart.findById(chartId).select('dept deptName position answerKey keyMeta workType').lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found');
  await findChart(student, chart.dept, chartId);
  const work = await ChartWork.findOne({ student: student._id, chart: chartId }).select('queries').lean();
  const pending = work && work.queries.some((q) => new Date(q.answerAt).getTime() > Date.now());
  if (pending) throw new ApiError(httpStatus.CONFLICT, 'A physician query is still pending on this chart');

  const department = await Department.findById(chart.dept).select('elements').lean();
  const isInpatient = ((department && department.elements) || []).some((e) => e === 'ICD10PCS' || e === 'DRG');
  const result = gradeWork({ ...chart, isInpatient, workType: chart.workType || WORK_TYPES.CODE }, submission);
  const saved = toSaved(result, chart.dept, Date.now());

  const filter = { student: student._id, chart: chart._id };
  const write = () => ChartResult.findOneAndReplace(filter, { ...filter, ...saved }, { upsert: true });
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

module.exports = { toClientWork, getWork, saveDraft, deferChart, transferChart, sendQuery, openSession, addComment, submitWork, findChart };
