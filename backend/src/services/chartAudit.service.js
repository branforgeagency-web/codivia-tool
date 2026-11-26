const { AuditAssignment, Chart, ChartAudit, ChartResult, ChartWork, Department, User } = require('../models');
const {
  ANSWER_KEY_GROUPS,
  AUDIT_LIMITS,
  AUDIT_PRIORITY_BELOW,
  AUDIT_QUEUE_TABS,
  AUDIT_STATUS,
  AUDIT_STATUS_LIST,
  AUDIT_VERDICT_OPTIONS,
  AUDIT_VERDICTS,
  FINDING_TYPES,
} = require('../config/auditors');
const { ROLES } = require('../config/roles');
const { USER_STATUS } = require('../config/userStatus');
const { WORK_LIMITS, WORK_TYPES } = require('../config/workQueue');
const { encounterProfile } = require('../config/encounter');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// ---------- Coding audit (auditor role) ----------
// An auditor sees only the students an admin assigned to them, and only in the assigned departments.
// A submitted chart (ChartResult) is "pending" until the auditor completes an audit of that exact
// submission; completing it sets the student's official score (ChartResult.accuracy) to the audited one.

const notFound = (what = 'Chart') => new ApiError(httpStatus.NOT_FOUND, `${what} not found in your audit assignments`);
const fieldError = (field, message) => new ApiError(httpStatus.BAD_REQUEST, message, [{ field, message }]);
const average = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);
const pairKey = (student, chart) => `${student}|${chart}`;

// The automatic score of a result (after an audit, `accuracy` holds the audited score).
const autoOf = (r) => (r.autoAccuracy != null ? r.autoAccuracy : r.accuracy);

// This auditor's assignments with live students only: [{ student, dept }].
const myAssignments = async (auditor) => {
  const rows = await AuditAssignment.find({ auditor: auditor._id }).select('student dept').lean();
  if (!rows.length) return [];
  const live = new Set((await User.find({ _id: { $in: rows.map((r) => r.student) }, role: ROLES.STUDENT, deletedAt: null }).distinct('_id')).map(String));
  return rows.filter((r) => live.has(String(r.student)));
};

const assertAssigned = async (auditor, studentId, dept) => {
  const ok = await AuditAssignment.exists({ auditor: auditor._id, student: studentId, dept });
  if (!ok) throw notFound();
};

// Every submitted chart in this auditor's assignments, with its audit status.
const buildRows = async (auditor) => {
  const assignments = await myAssignments(auditor);
  if (!assignments.length) return { assignments, rows: [] };
  const byDept = new Map();
  assignments.forEach((a) => byDept.set(a.dept, [...(byDept.get(a.dept) || []), a.student]));
  const results = await ChartResult.find({ $or: [...byDept].map(([dept, students]) => ({ dept, student: { $in: students } })) })
    .select('student chart dept accuracy autoAccuracy at audit')
    .lean();
  const audits = await ChartAudit.find({ student: { $in: [...new Set(results.map((r) => String(r.student)))] } })
    .select('student chart status resultAt verdict finalAccuracy completedAt updatedAt')
    .lean();
  const auditOf = new Map(audits.map((a) => [pairKey(a.student, a.chart), a]));

  const rows = results.map((r) => {
    const a = auditOf.get(pairKey(r.student, r.chart));
    const current = a && a.resultAt === r.at ? a : null; // an audit of an older submission doesn't count
    const auto = autoOf(r);
    return {
      student: String(r.student),
      chart: r.chart,
      dept: r.dept,
      at: r.at,
      autoAccuracy: auto,
      accuracy: r.accuracy,
      priority: auto < AUDIT_PRIORITY_BELOW,
      status: current ? current.status : AUDIT_STATUS.PENDING,
      verdict: current && current.status === AUDIT_STATUS.COMPLETED ? current.verdict : null,
      finalAccuracy: current && current.status === AUDIT_STATUS.COMPLETED ? current.finalAccuracy : null,
      completedAt: current ? current.completedAt : null,
      reaudit: Boolean(a && !current), // submitted again after an earlier audit
    };
  });
  return { assignments, rows };
};

const studentsById = async (ids) => {
  const users = await User.find({ _id: { $in: ids } }).select('name email studentId status').lean();
  return new Map(
    users.map((s) => [
      String(s._id),
      { uid: String(s._id), id: s.studentId || String(s._id), name: s.name || s.email, email: s.email, accountStatus: s.status === USER_STATUS.DISABLED ? 'disabled' : 'active' },
    ])
  );
};
const deptNames = async () => new Map((await Department.find().select('name order').lean()).map((d) => [d._id, d]));

const countBy = (rows) => ({
  submitted: rows.length,
  pending: rows.filter((r) => r.status === AUDIT_STATUS.PENDING).length,
  draft: rows.filter((r) => r.status === AUDIT_STATUS.DRAFT).length,
  completed: rows.filter((r) => r.status === AUDIT_STATUS.COMPLETED).length,
  priority: rows.filter((r) => r.priority && r.status !== AUDIT_STATUS.COMPLETED).length,
});

// Dashboard tiles.
const getSummary = async (auditor) => {
  const { assignments, rows } = await buildRows(auditor);
  const done = rows.filter((r) => r.status === AUDIT_STATUS.COMPLETED);
  return {
    students: new Set(assignments.map((a) => String(a.student))).size,
    departments: new Set(assignments.map((a) => a.dept)).size,
    ...countBy(rows),
    agreementRate: done.length ? Math.round((done.filter((r) => r.verdict === AUDIT_VERDICTS.AGREE).length / done.length) * 100) : null,
    avgAuto: average(done.map((r) => r.autoAccuracy)),
    avgFinal: average(done.map((r) => r.finalAccuracy)),
    priorityBelow: AUDIT_PRIORITY_BELOW,
  };
};

// My Students: every assigned student with their departments and audit counts.
const getStudents = async (auditor, { search, dept, page = 1, limit = 10 } = {}) => {
  const { assignments, rows } = await buildRows(auditor);
  const [students, depts] = await Promise.all([studentsById(assignments.map((a) => a.student)), deptNames()]);
  const byStudent = new Map();
  assignments.forEach((a) => {
    const k = String(a.student);
    if (!byStudent.has(k)) byStudent.set(k, []);
    byStudent.get(k).push(a.dept);
  });
  let all = [...byStudent].map(([uid, keys]) => {
    const mine = rows.filter((r) => r.student === uid);
    return {
      ...students.get(uid),
      departments: keys
        .map((k) => ({ key: k, name: (depts.get(k) || {}).name || k, order: (depts.get(k) || {}).order ?? 999, ...countBy(mine.filter((r) => r.dept === k)) }))
        .sort((x, y) => x.order - y.order)
        .map(({ order, ...d }) => d),
      totals: { ...countBy(mine), avg: average(mine.map((r) => r.accuracy)) },
    };
  });
  all = all.filter((s) => s.uid).sort((x, y) => y.totals.pending - x.totals.pending || x.name.localeCompare(y.name));
  if (dept) all = all.filter((s) => s.departments.some((d) => d.key === dept));
  const term = (search || '').toLowerCase();
  const matched = term ? all.filter((s) => `${s.name} ${s.id} ${s.email}`.toLowerCase().includes(term)) : all;
  return {
    results: matched.slice((page - 1) * limit, page * limit),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    departments: [...new Set(assignments.map((a) => a.dept))].map((k) => ({ key: k, name: (depts.get(k) || {}).name || k })),
  };
};

// Audit queue: submitted charts, filtered by tab / student / department / priority / search.
// "To audit" lists priority (low score) charts first, then oldest first; "Audited" newest first.
const getQueue = async (auditor, { status = 'pending', student, dept, priority, search, page = 1, limit = 10 } = {}) => {
  const { assignments, rows } = await buildRows(auditor);
  const [students, depts] = await Promise.all([studentsById(assignments.map((a) => a.student)), deptNames()]);
  let scoped = rows;
  if (student) scoped = scoped.filter((r) => r.student === String(student));
  if (dept) scoped = scoped.filter((r) => r.dept === dept);
  if (priority) scoped = scoped.filter((r) => r.priority);
  const term = (search || '').toLowerCase();
  if (term) scoped = scoped.filter((r) => `${r.chart} ${(students.get(r.student) || {}).name || ''} ${(students.get(r.student) || {}).id || ''}`.toLowerCase().includes(term));

  const inTab = status === 'all' ? scoped : scoped.filter((r) => r.status === status);
  const sorted = [...inTab].sort((x, y) =>
    status === AUDIT_STATUS.COMPLETED
      ? new Date(y.completedAt || 0) - new Date(x.completedAt || 0)
      : Number(y.priority) - Number(x.priority) || x.at - y.at
  );
  const pageRows = sorted.slice((page - 1) * limit, page * limit);
  const charts = await Chart.find({ _id: { $in: pageRows.map((r) => r.chart) } }).select('title workType difficulty patient.name').lean();
  const chartOf = new Map(charts.map((c) => [c._id, c]));

  return {
    results: pageRows.map((r) => {
      const c = chartOf.get(r.chart) || {};
      return {
        ...r,
        student: students.get(r.student) || { uid: r.student, name: 'Student' },
        deptName: (depts.get(r.dept) || {}).name || r.dept,
        title: c.title || '',
        workType: c.workType || WORK_TYPES.CODE,
        difficulty: c.difficulty || '',
        patient: (c.patient && c.patient.name) || '',
      };
    }),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
    totalResults: sorted.length,
    filters: AUDIT_QUEUE_TABS.map((t) => ({ ...t, count: t.key === 'all' ? scoped.length : scoped.filter((r) => r.status === t.key).length })),
    departments: [...new Set(assignments.map((a) => a.dept))].map((k) => ({ key: k, name: (depts.get(k) || {}).name || k })),
    priorityBelow: AUDIT_PRIORITY_BELOW,
  };
};

// One submitted chart to audit: the full chart (with the answer key), the student's submission and
// grading checklist, their saved work (draft, queries, time) and this auditor's audit so far.
const getAudit = async (auditor, studentId, chartId) => {
  const chart = await Chart.findById(chartId).select('-createdAt -updatedAt -__v').lean();
  if (!chart) throw notFound();
  await assertAssigned(auditor, studentId, chart.dept);
  const [result, work, audit, student, department] = await Promise.all([
    ChartResult.findOne({ student: studentId, chart: chartId }).select('-_id -student').lean(),
    ChartWork.findOne({ student: studentId, chart: chartId }).select('draft timeSpent queries submittedAt activity').lean(),
    ChartAudit.findOne({ student: studentId, chart: chartId }).lean(),
    studentsById([studentId]),
    Department.findById(chart.dept).select('name elements').lean(),
  ]);
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, 'This chart has not been submitted yet');
  const elements = (department && department.elements) || [];
  const profile = encounterProfile(chart, elements);
  const { _id, ...rest } = chart;
  const current = audit && audit.resultAt === result.at ? audit : null;

  return {
    student: student.get(String(studentId)),
    chart: {
      id: _id,
      ...rest,
      workType: chart.workType || WORK_TYPES.CODE,
      deptName: chart.deptName || (department && department.name) || chart.dept,
      elements,
      encounterType: profile.encounterType,
      billingType: profile.billingType,
      isInpatient: profile.facilityIP,
    },
    result: { ...result, autoAccuracy: autoOf(result), priority: autoOf(result) < AUDIT_PRIORITY_BELOW },
    work: work
      ? {
          draft: work.draft || null,
          timeSpent: work.timeSpent || 0,
          submittedAt: work.submittedAt,
          queries: (work.queries || []).map((q) => ({ to: q.to, question: q.question, answer: q.answer || '', sentAt: q.sentAt, answeredAt: q.answeredAt || q.answerAt || null })),
          comments: (work.activity || []).filter((a) => a.kind === 'comment').map((a) => ({ at: a.at, text: a.text })),
        }
      : null,
    audit: current
      ? { status: current.status, verdict: current.verdict || null, finalAccuracy: current.finalAccuracy ?? null, findings: current.findings || [], feedback: current.feedback || '', completedAt: current.completedAt, updatedAt: current.updatedAt }
      : { status: AUDIT_STATUS.PENDING, verdict: null, finalAccuracy: null, findings: [], feedback: '', completedAt: null, reaudit: Boolean(audit) },
    findingTypes: FINDING_TYPES,
  };
};

const pushActivity = (text) => ({ $push: { activity: { $each: [{ at: new Date(), kind: 'audit', text: String(text).slice(0, 300) }], $slice: -WORK_LIMITS.activity } } });

// Save the audit (draft) or complete it. `resultAt` is the submission the auditor reviewed: if the
// student submitted again meanwhile, the save is refused so the auditor reloads the new submission.
// Completing sets the official score: agree = the automatic score, adjusted = finalAccuracy.
const saveAudit = async (auditor, studentId, chartId, { resultAt, verdict, finalAccuracy, findings = [], feedback = '', complete = false }) => {
  const chart = await Chart.findById(chartId).select('dept').lean();
  if (!chart) throw notFound();
  await assertAssigned(auditor, studentId, chart.dept);
  const result = await ChartResult.findOne({ student: studentId, chart: chartId }).select('accuracy autoAccuracy at').lean();
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, 'This chart has not been submitted yet');
  if (result.at !== resultAt) throw new ApiError(httpStatus.CONFLICT, 'The student submitted this chart again. Reload to audit the new submission.');

  const auto = autoOf(result);
  const existing = await ChartAudit.findOne({ student: studentId, chart: chartId }).select('status resultAt').lean();
  const wasCompleted = existing && existing.resultAt === result.at && existing.status === AUDIT_STATUS.COMPLETED;
  if (wasCompleted && !complete) throw new ApiError(httpStatus.CONFLICT, 'This audit is already completed. Use "Update audit" to change it.');

  if (complete) {
    if (!verdict) throw fieldError('verdict', 'Choose whether you agree with the automatic score or adjust it');
    if (verdict === AUDIT_VERDICTS.ADJUSTED) {
      if (finalAccuracy == null) throw fieldError('finalAccuracy', 'Enter the audited score');
      if (!feedback.trim()) throw fieldError('feedback', 'Explain the score adjustment in the feedback to the student');
    }
  }
  const final = verdict === AUDIT_VERDICTS.AGREE ? auto : finalAccuracy;
  const set = {
    dept: chart.dept,
    auditor: auditor._id,
    resultAt: result.at,
    autoAccuracy: auto,
    verdict: verdict || undefined,
    finalAccuracy: final ?? undefined,
    findings,
    feedback,
    status: complete ? AUDIT_STATUS.COMPLETED : AUDIT_STATUS.DRAFT,
    completedAt: complete ? new Date() : null,
  };
  const audit = await ChartAudit.findOneAndUpdate({ student: studentId, chart: chartId }, { $set: set }, { upsert: true, returnDocument: 'after', lean: true });

  if (complete) {
    // What the student sees (with readable finding labels).
    const labelOf = new Map(FINDING_TYPES.map((t) => [t.key, t.label]));
    const summary = {
      verdict,
      finalAccuracy: final,
      autoAccuracy: auto,
      findings: findings.map((f) => ({ ...f, label: labelOf.get(f.type) || f.type })),
      feedback,
      auditorName: auditor.name || auditor.email,
      at: Date.now(),
    };
    // Matched on `at`, so a submission that arrived after the check above is never overwritten.
    await ChartResult.updateOne({ student: studentId, chart: chartId, at: result.at }, { $set: { accuracy: final, autoAccuracy: auto, audit: summary } });
    await ChartWork.updateOne(
      { student: studentId, chart: chartId },
      pushActivity(verdict === AUDIT_VERDICTS.AGREE ? `Audited — agreed with ${auto}%` : `Audited — score adjusted ${auto}% → ${final}%`)
    );
  }
  return { audit, wasCompleted, autoAccuracy: auto, finalAccuracy: final ?? null };
};

// Everything the auditor pages show that is not data: labels, options, thresholds and limits.
const getMeta = () => ({
  statuses: AUDIT_STATUS_LIST,
  queueTabs: AUDIT_QUEUE_TABS,
  verdicts: AUDIT_VERDICT_OPTIONS,
  findingTypes: FINDING_TYPES,
  keyGroups: ANSWER_KEY_GROUPS,
  priorityBelow: AUDIT_PRIORITY_BELOW,
  limits: { findings: AUDIT_LIMITS.findings, findingComment: AUDIT_LIMITS.findingComment, feedback: AUDIT_LIMITS.feedback, code: AUDIT_LIMITS.code },
});

module.exports = { getMeta, getSummary, getStudents, getQueue, getAudit, saveAudit };
