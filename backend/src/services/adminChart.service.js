const { Chart, Department } = require('../models');
const { DIFFICULTIES } = require('../models/chart.model');
const { DEPARTMENT_GROUPS } = require('../config/departments');
const { DEPARTMENT_FILTERS } = require('../config/adminDepartments');
const { CHART_STATUS_FILTERS } = require('../config/adminCharts');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { escapeRegex } = require('../utils/codeText');

const SORT = {
  position: { dept: 1, position: 1 },
  title: { title: 1 },
  patient: { 'patient.name': 1 },
  difficulty: { levelRank: 1 },
};

// A chart as the frontend holds it (window.CHART_DATA entries): id, dept, ..., answerKey, handwritten,
// plus uploaded / source. `record` (the long clinical note) only comes with GET /:chartId.
const toChart = ({ _id, levelRank, source, createdAt, updatedAt, __v, ...c }) => ({ id: _id, ...c, uploaded: source === 'upload', source });

// { all, beginner, moderate, advanced, handwritten } for the charts matching `match`.
const countStatuses = async (match) => {
  const [row] = await Chart.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        all: { $sum: 1 },
        handwritten: { $sum: { $cond: ['$handwritten', 1, 0] } },
        ...Object.fromEntries(DIFFICULTIES.map((d) => [d, { $sum: { $cond: [{ $eq: ['$difficulty', d] }, 1, 0] } }])),
      },
    },
  ]);
  return Object.fromEntries(CHART_STATUS_FILTERS.map((f) => [f.key, row?.[f.key] || 0]));
};

// ---------- screen 1: departments ----------

// Department cards with their chart counts, the stat tiles and the group tabs. Statistics and tab
// counts cover every department; group, search and page only change `results`.
const queryDepartments = async ({ group = 'all', search, page = 1, limit = 10 }) => {
  const [departments, counts] = await Promise.all([
    Department.find().select('name icon group elements order isActive').lean(),
    Chart.aggregate([
      {
        $group: {
          _id: '$dept',
          charts: { $sum: 1 },
          handwritten: { $sum: { $cond: ['$handwritten', 1, 0] } },
          uploaded: { $sum: { $cond: [{ $eq: ['$source', 'upload'] }, 1, 0] } },
          ...Object.fromEntries(DIFFICULTIES.map((d) => [d, { $sum: { $cond: [{ $eq: ['$difficulty', d] }, 1, 0] } }])),
        },
      },
    ]),
  ]);
  const byDept = Object.fromEntries(counts.map((c) => [c._id, c]));

  const all = departments
    .filter((d) => byDept[d._id]?.charts > 0)
    .sort((a, b) => a.order - b.order)
    .map((d) => ({
      key: d._id,
      name: d.name,
      icon: d.icon,
      group: d.group,
      elements: d.elements,
      isActive: d.isActive,
      charts: byDept[d._id].charts,
      handwritten: byDept[d._id].handwritten,
      uploaded: byDept[d._id].uploaded,
      levels: Object.fromEntries(DIFFICULTIES.map((l) => [l, byDept[d._id][l]])), // { beginner, moderate, advanced }
    }));

  const inGroup = (g) => (g === 'all' ? all : all.filter((d) => d.group === g));
  const term = (search || '').toLowerCase();
  const matched = inGroup(group).filter((d) => !term || d.key.toLowerCase().includes(term) || d.name.toLowerCase().includes(term));
  const sum = (field) => all.reduce((n, d) => n + d[field], 0);

  return {
    results: matched.slice((page - 1) * limit, page * limit),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    filters: DEPARTMENT_FILTERS.map((f) => ({ ...f, count: inGroup(f.key).length })),
    statistics: {
      departments: all.length,
      specialty: inGroup(DEPARTMENT_GROUPS.SPECIALTY).length,
      setting: inGroup(DEPARTMENT_GROUPS.SETTING).length,
      charts: sum('charts'),
      handwritten: sum('handwritten'),
      uploaded: sum('uploaded'),
    },
  };
};

// ---------- screen 2: charts ----------

// One department's charts (or all charts when no dept), with the status tabs and their counts.
// Tab counts cover the whole department; status, search, sort and page only change `results`.
const queryCharts = async ({ dept, status = 'all', search, sortBy = 'position', order = 'asc', page = 1, limit = 10 }) => {
  let department = null;
  if (dept) {
    const d = await Department.findById(dept).select('name group elements').lean();
    if (!d) throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
    department = { key: d._id, name: d.name, group: d.group, elements: d.elements };
  }

  const scope = dept ? { dept } : {};
  const match = { ...scope };
  if (status === 'handwritten') match.handwritten = true;
  else if (status !== 'all') match.difficulty = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ _id: pattern }, { title: pattern }, { 'patient.name': pattern }, { 'answerKey.code': pattern }];
  }

  const dir = order === 'asc' ? 1 : -1;
  const sort = Object.fromEntries([...Object.entries(SORT[sortBy]).map(([k, v]) => [k, v * dir]), ['_id', 1]]);
  const [[facet], counts] = await Promise.all([
    Chart.aggregate([
      { $match: match },
      { $addFields: { levelRank: { $indexOfArray: [DIFFICULTIES, '$difficulty'] } } },
      { $sort: sort },
      { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { record: 0 } }], total: [{ $count: 'n' }] } },
    ]),
    countStatuses(scope),
  ]);
  const totalResults = facet.total[0]?.n || 0;

  return {
    department,
    results: facet.rows.map(toChart),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
    filters: CHART_STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.key] })),
  };
};

// One chart with its full record and answer key (the View popup).
const getChart = async (chartId) => {
  const chart = await Chart.findById(chartId).lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found');
  return toChart(chart);
};

module.exports = { queryDepartments, queryCharts, getChart };
