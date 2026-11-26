const { Allocation, Certificate, Chart, ChartResult, ChartWork, Department } = require('../models');
const { CERT_THRESHOLD } = require('../config/certificates');
const { QUEUE_TABS, WORK_STATUS, WORK_TYPES, WORK_TYPE_LIST } = require('../config/workQueue');
const chartWorkService = require('./chartWork.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');
const { chartHeader, HEADER_FIELDS } = require('../utils/chartHeader');
const { encounterProfile, isInpatientElements } = require('../config/encounter');
const { DRAFT_SYNC } = require('../config/drafts');

// ---------- Student "My Charts" ----------
// Only the signed-in student's own allocated departments and charts. Never returns answer keys.

const average = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0);
const notAllocated = () => new ApiError(httpStatus.NOT_FOUND, 'This department is not allocated to you');

// The allocated range clamped to the department's pool (same as allocationService.rangeCount).
const clampRange = (start, end, pool) => {
  if (!pool) return null;
  const from = Math.min(start, pool);
  return { start: from, end: Math.max(from, Math.min(end, pool)) };
};

const statusOf = (assigned, worked) => (assigned > 0 && worked >= assigned ? 'complete' : worked ? 'active' : 'new');

const MY_CHART_FILTERS = [
  { key: 'all', label: 'All departments' },
  { key: 'active', label: 'In progress' },
  { key: 'new', label: 'Not started' },
  { key: 'complete', label: 'Completed' },
];

// The student's scores in these departments, each with the chart's position (allocations are by position).
const scoresWithPosition = (studentId, depts) =>
  ChartResult.aggregate([
    { $match: { student: studentId, dept: { $in: depts } } },
    {
      $lookup: {
        from: Chart.collection.name,
        let: { chartId: '$chart' },
        pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$chartId'] } } }, { $project: { position: 1 } }],
        as: 'chart',
      },
    },
    { $project: { _id: 0, chart: 1, dept: 1, accuracy: 1, position: { $arrayElemAt: ['$chart.position', 0] } } },
  ]);

// Every allocated, active department with charts, as a card with progress. Ordered like the admin list.
const buildCards = async (student) => {
  const allocations = await Allocation.find({ student: student._id }).select('dept start end').lean();
  const keys = allocations.map((a) => a.dept);
  if (!keys.length) return [];

  const [departments, pools, scores] = await Promise.all([
    Department.find({ _id: { $in: keys }, isActive: true }).select('name icon group elements order').lean(),
    Chart.aggregate([{ $match: { dept: { $in: keys } } }, { $group: { _id: '$dept', n: { $sum: 1 } } }]),
    scoresWithPosition(student._id, keys),
  ]);
  const poolByDept = Object.fromEntries(pools.map((p) => [p._id, p.n]));
  const deptByKey = new Map(departments.map((d) => [d._id, d]));

  return allocations
    .filter((a) => deptByKey.has(a.dept) && poolByDept[a.dept] > 0)
    .map((a) => {
      const d = deptByKey.get(a.dept);
      const pool = poolByDept[a.dept];
      const range = clampRange(a.start, a.end, pool);
      const assigned = range.end - range.start + 1;
      const inRange = scores.filter((s) => s.dept === a.dept && s.position >= range.start && s.position <= range.end);
      const worked = inRange.length;
      return {
        key: d._id,
        name: d.name,
        icon: d.icon,
        group: d.group,
        elements: d.elements,
        order: d.order,
        pool,
        range,
        assigned,
        worked,
        remaining: assigned - worked,
        avg: average(inRange.map((s) => s.accuracy)),
        percent: Math.round((worked / assigned) * 100),
        status: statusOf(assigned, worked),
      };
    })
    .sort((x, y) => x.order - y.order)
    .map(({ order, ...card }) => card);
};

// Overall progress for the stat tiles (Dashboard, My Charts, sidebar): every saved score, whatever
// the department or range, plus the certificates earned.
const overallStats = async (student) => {
  const [[scores], certificates] = await Promise.all([
    ChartResult.aggregate([{ $match: { student: student._id } }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$accuracy' } } }]),
    Certificate.find({ student: student._id }).select('dept').lean(),
  ]);
  return {
    totalWorked: scores ? scores.n : 0,
    overallAvg: scores ? Math.round(scores.avg) : 0,
    certificates: { threshold: CERT_THRESHOLD, earned: certificates.length, depts: certificates.map((c) => c.dept), anyCertified: certificates.length > 0 },
  };
};

// My Charts page and student Dashboard: department cards (search + status tabs + pages) and the
// stat tiles. Statistics and tab counts cover every allocated department.
//   statistics: { assigned, worked, remaining, departments,          <- inside the allocated ranges
//                 totalWorked, overallAvg, certificates: { threshold, earned, depts, anyCertified } }
const getMyDepartments = async (student, { search, status = 'all', page = 1, limit = 10 } = {}) => {
  const [cards, overall] = await Promise.all([buildCards(student), overallStats(student)]);
  const certified = new Set(overall.certificates.depts);
  const all = cards.map((d) => ({ ...d, certified: certified.has(d.key) }));
  const term = (search || '').toLowerCase();
  const searched = term ? all.filter((d) => `${d.name} ${d.key}`.toLowerCase().includes(term)) : all;
  const matched = status === 'all' ? searched : searched.filter((d) => d.status === status);
  const sum = (field) => all.reduce((n, d) => n + d[field], 0);
  return {
    results: matched.slice((page - 1) * limit, page * limit),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    filters: MY_CHART_FILTERS.map((f) => ({ ...f, count: f.key === 'all' ? all.length : all.filter((d) => d.status === f.key).length })),
    statistics: { assigned: sum('assigned'), worked: sum('worked'), remaining: sum('remaining'), departments: all.length, ...overall },
  };
};

// The student's allocated range in one department, or 404.
const findMyRange = async (student, deptKey) => {
  const [allocation, department, pool] = await Promise.all([
    Allocation.findOne({ student: student._id, dept: deptKey }).select('start end').lean(),
    Department.findOne({ _id: deptKey, isActive: true }).select('name icon group elements').lean(),
    Chart.countDocuments({ dept: deptKey }),
  ]);
  if (!allocation || !department || !pool) throw notAllocated();
  return { department, pool, range: clampRange(allocation.start, allocation.end, pool) };
};

// Where a chart sits in the student's queue: deferred, done (scored or transferred) or to do.
const tabOf = (work, scored) => {
  if (work && work.status === WORK_STATUS.DEFERRED) return 'deferred';
  if (scored || (work && work.status === WORK_STATUS.TRANSFERRED)) return 'done';
  return 'todo';
};

// Queue columns: the structured encounter wins over what the record header says.
const queueColumns = (c) => {
  const h = chartHeader(c.record);
  const e = c.encounter || {};
  const ptype = e.ptype ? (e.ptype === 'new' ? 'New patient' : 'Established patient') : h.ptype;
  return {
    mrn: e.mrn || h.mrn,
    dos: e.dos || e.discharge || h.dos,
    dosLabel: e.discharge && !e.dos ? 'Discharge' : h.dosLabel,
    payer: e.payer || h.payer,
    facility: e.facility || h.facility,
    provider: e.provider || h.provider,
    ptype,
  };
};

// Chart queue for one department: the student's allocated charts, 10 per page. Tabs follow the
// student's own work (to do / deferred / completed), chips filter by work type, search covers the
// chart ID, patient name and record header.
const getMyQueue = async (student, deptKey, { search, status = 'todo', type = 'all', page = 1, limit = 10 } = {}) => {
  const { department, pool, range } = await findMyRange(student, deptKey);
  const inRange = { dept: deptKey, position: { $gte: range.start, $lte: range.end } };

  const [rangeCharts, results, works] = await Promise.all([
    Chart.find(inRange).select('_id workType').lean(),
    ChartResult.find({ student: student._id, dept: deptKey }).select('chart accuracy at audit.verdict').lean(),
    ChartWork.find({ student: student._id, dept: deptKey }).select('chart status defer transfer updatedAt').lean(),
  ]);
  const scoreOf = new Map(results.map((r) => [r.chart, r]));
  const workOf = new Map(works.map((w) => [w.chart, w]));
  const byTab = { todo: [], deferred: [], done: [] };
  rangeCharts.forEach((c) => byTab[tabOf(workOf.get(c._id), scoreOf.has(c._id))].push(c));
  const inTab = status === 'all' ? rangeCharts : byTab[status];
  const typeCounts = WORK_TYPE_LIST.map((t) => ({ key: t, count: inTab.filter((c) => (c.workType || WORK_TYPES.CODE) === t).length }));
  const ids = inTab.filter((c) => type === 'all' || (c.workType || WORK_TYPES.CODE) === type).map((c) => c._id);

  const match = { ...inRange, _id: { $in: ids } };
  if (search) {
    const term = escapeRegex(search);
    match.$or = [
      { _id: new RegExp(term, 'i') },
      { 'patient.name': new RegExp(term, 'i') },
      { record: new RegExp(`^(${HEADER_FIELDS.join('|')}):.*${term}`, 'im') },
      { 'encounter.mrn': new RegExp(term, 'i') },
      { 'encounter.payer': new RegExp(term, 'i') },
    ];
  }

  const [rows, totalResults] = await Promise.all([
    Chart.find(match)
      .sort({ position: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('position handwritten difficulty record patient workType encounterType billingType encounter original.rules original.lines denial.invoice')
      .lean(),
    Chart.countDocuments(match),
  ]);
  const scored = rangeCharts.filter((c) => scoreOf.has(c._id));
  const assigned = range.end - range.start + 1;

  return {
    department: { key: department._id, name: department.name, icon: department.icon, group: department.group, elements: department.elements, pool },
    summary: {
      range,
      assigned,
      worked: scored.length,
      avg: average(scored.map((c) => scoreOf.get(c._id).accuracy)),
      percent: assigned ? Math.round((scored.length / assigned) * 100) : 0,
    },
    filters: QUEUE_TABS.map((f) => ({ ...f, count: byTab[f.key].length })),
    types: typeCounts.filter((t) => t.count > 0 || t.key === WORK_TYPES.CODE),
    results: rows.map((c) => {
      const work = workOf.get(c._id);
      const score = scoreOf.get(c._id);
      const remits = ((c.original && c.original.lines) || []).map((l) => l.remit).filter(Boolean);
      return {
        id: c._id,
        position: c.position,
        workType: c.workType || WORK_TYPES.CODE,
        encounterType: encounterProfile(c, department.elements).encounterType,
        handwritten: !!c.handwritten,
        difficulty: c.difficulty,
        patient: c.patient ? c.patient.name : '',
        ...queueColumns(c),
        tab: tabOf(work, !!score),
        accuracy: score ? score.accuracy : null,
        audited: Boolean(score && score.audit), // an auditor reviewed this submission
        inProgress: !!work && work.status === WORK_STATUS.IN_PROGRESS && !score,
        deferReason: work && work.status === WORK_STATUS.DEFERRED ? (work.defer || {}).reason || '' : '',
        transferredTo: work && work.status === WORK_STATUS.TRANSFERRED ? (work.transfer || {}).queue || '' : '',
        rules: (c.original && c.original.rules) || [],
        remit: remits.find((r) => r !== 'CO-97') || remits[0] || '',
        daysToAppeal: c.denial && c.denial.invoice ? c.denial.invoice.daysToAppeal : null,
      };
    }),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
};

const isInpatientDept = isInpatientElements;

// One chart to work: documents, encounter, what arrived with it (review / denial), the student's
// saved work and the option lists. Never the answer key. Only charts in the student's range.
const getMyChart = async (student, deptKey, chartId) => {
  const { department, range } = await findMyRange(student, deptKey);
  const chart = await Chart.findOne({ _id: chartId, dept: deptKey, position: { $gte: range.start, $lte: range.end } })
    .select('-answerKey -keyMeta -cdiResponse -createdAt -updatedAt -__v')
    .lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found in your allocation');
  const [work, result, queue] = await Promise.all([
    ChartWork.findOne({ student: student._id, chart: chartId }).lean(),
    ChartResult.findOne({ student: student._id, chart: chartId }).select('-_id -student').lean(),
    // Charts seeded before work types existed have no workType: they are "code".
    Chart.find({
      dept: deptKey,
      position: { $gte: range.start, $lte: range.end },
      workType: !chart.workType || chart.workType === WORK_TYPES.CODE ? { $in: [null, WORK_TYPES.CODE] } : chart.workType,
    })
      .select('_id')
      .sort({ position: 1 })
      .lean(),
  ]);
  const { _id, source, ...rest } = chart;
  const usedRemits = new Set(((chart.original && chart.original.lines) || []).map((l) => l.remit).filter(Boolean));
  // Encounter type and billing type come from the chart record (older charts: from the department).
  // Read-only for the student; submitting checks against the same values on the server.
  const profile = encounterProfile(chart, department.elements);
  return {
    id: _id,
    ...rest,
    workType: chart.workType || WORK_TYPES.CODE,
    uploaded: source === 'upload',
    elements: department.elements,
    deptName: chart.deptName || department.name,
    encounterType: profile.encounterType,
    billingType: profile.billingType,
    encounterTypeSet: profile.explicit,
    // Inpatient hospital (facility) claim: POA, ICD-10-PCS, abstract, MS-DRG.
    isInpatient: profile.facilityIP,
    position: { index: queue.findIndex((c) => c._id === _id) + 1, of: queue.length },
    work: chartWorkService.toClientWork(work),
    result: result || null,
    // Option lists (defer reasons, remit descriptions …) come from GET /reference/work-queue.
    remits: [...usedRemits],
    // Offline-safe saving: timing and wording for the workspace (config/drafts.js).
    draftSync: DRAFT_SYNC,
  };
};

module.exports = { getMyDepartments, getMyQueue, getMyChart, findMyRange, isInpatientDept };
