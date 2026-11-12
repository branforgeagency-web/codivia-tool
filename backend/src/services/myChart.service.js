const { Allocation, Certificate, Chart, ChartResult, Department } = require('../models');
const { CERT_THRESHOLD } = require('../config/certificates');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');
const { chartHeader, HEADER_FIELDS } = require('../utils/chartHeader');

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

const QUEUE_FILTERS = [
  { key: 'all', label: 'All charts' },
  { key: 'pending', label: 'Not started' },
  { key: 'worked', label: 'Worked' },
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

// Chart queue for one department: the student's allocated charts, 10 per page, with the header
// columns, the student's score, status tabs (all / pending / worked) and a search over the header.
const getMyQueue = async (student, deptKey, { search, status = 'all', page = 1, limit = 10 } = {}) => {
  const { department, pool, range } = await findMyRange(student, deptKey);
  const inRange = { dept: deptKey, position: { $gte: range.start, $lte: range.end } };

  const results = await ChartResult.find({ student: student._id, dept: deptKey }).select('chart accuracy').lean();
  const scoreOf = new Map(results.map((r) => [r.chart, r.accuracy]));
  const rangeIds = await Chart.find(inRange).distinct('_id');
  const workedIds = rangeIds.filter((id) => scoreOf.has(id));

  const match = { ...inRange };
  if (status === 'worked') match._id = { $in: workedIds };
  else if (status === 'pending') match._id = { $nin: workedIds };
  if (search) {
    const term = escapeRegex(search);
    match.$or = [
      { _id: new RegExp(term, 'i') },
      { record: new RegExp(`^(${HEADER_FIELDS.join('|')}):.*${term}`, 'im') },
    ];
  }

  const [rows, totalResults] = await Promise.all([
    Chart.find(match).sort({ position: 1 }).skip((page - 1) * limit).limit(limit).select('position handwritten difficulty record').lean(),
    Chart.countDocuments(match),
  ]);
  const accs = workedIds.map((id) => scoreOf.get(id));
  const assigned = range.end - range.start + 1;

  return {
    department: { key: department._id, name: department.name, icon: department.icon, group: department.group, elements: department.elements, pool },
    summary: {
      range,
      assigned,
      worked: workedIds.length,
      avg: average(accs),
      percent: assigned ? Math.round((workedIds.length / assigned) * 100) : 0,
    },
    filters: QUEUE_FILTERS.map((f) => ({
      ...f,
      count: f.key === 'all' ? assigned : f.key === 'worked' ? workedIds.length : assigned - workedIds.length,
    })),
    results: rows.map((c) => ({
      id: c._id,
      position: c.position,
      handwritten: !!c.handwritten,
      difficulty: c.difficulty,
      ...chartHeader(c.record),
      accuracy: scoreOf.has(c._id) ? scoreOf.get(c._id) : null,
    })),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
};

// One chart to code: the record and patient, no answer key. Only charts in the student's range.
const getMyChart = async (student, deptKey, chartId) => {
  const { department, range } = await findMyRange(student, deptKey);
  const chart = await Chart.findOne({ _id: chartId, dept: deptKey, position: { $gte: range.start, $lte: range.end } })
    .select('-answerKey -createdAt -updatedAt -__v')
    .lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found in your allocation');
  const { _id, source, ...rest } = chart;
  return { id: _id, ...rest, uploaded: source === 'upload', elements: department.elements };
};


module.exports = { getMyDepartments, getMyQueue, getMyChart };
