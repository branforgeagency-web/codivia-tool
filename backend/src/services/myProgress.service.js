const { Allocation, Chart, ChartResult, Department } = require('../models');
const { CERT_THRESHOLD } = require('../config/certificates');

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'certified', label: 'Certified' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'not-started', label: 'Not started' },
];

const statusOf = (worked) =>
  worked >= CERT_THRESHOLD ? 'certified' : worked > 0 ? 'in-progress' : 'not-started';

const getMyProgress = async (student, { status = 'all' } = {}) => {
  const [allocations, aggregates] = await Promise.all([
    Allocation.find({ student: student._id }).select('dept').lean(),
    ChartResult.aggregate([
      { $match: { student: student._id } },
      {
        $facet: {
          departments: [{ $group: { _id: '$dept', worked: { $sum: 1 }, avg: { $avg: '$accuracy' } } }],
          overall: [{ $group: { _id: null, totalWorked: { $sum: 1 }, avg: { $avg: '$accuracy' } } }],
        },
      },
    ]),
  ]);

  const keys = allocations.map((allocation) => allocation.dept);
  const [departments, pools] = keys.length
    ? await Promise.all([
        Department.find({ _id: { $in: keys }, isActive: true })
          .select('name icon group elements order')
          .lean(),
        Chart.aggregate([{ $match: { dept: { $in: keys } } }, { $group: { _id: '$dept', count: { $sum: 1 } } }]),
      ])
    : [[], []];

  const scoreByDept = new Map((aggregates[0]?.departments || []).map((score) => [score._id, score]));
  const poolByDept = new Map(pools.map((pool) => [pool._id, pool.count]));
  const all = departments
    .filter((department) => poolByDept.get(department._id) > 0)
    .map((department) => {
      const score = scoreByDept.get(department._id);
      const worked = score?.worked || 0;
      return {
        key: department._id,
        name: department.name,
        icon: department.icon,
        group: department.group,
        elements: department.elements,
        worked,
        avg: score ? Math.round(score.avg) : 0,
        certified: worked >= CERT_THRESHOLD,
        status: statusOf(worked),
      };
    })
    .sort(
      (a, b) =>
        Number(b.certified) - Number(a.certified) ||
        b.worked - a.worked ||
        a.name.localeCompare(b.name)
    );

  const count = (key) => (key === 'all' ? all.length : all.filter((department) => department.status === key).length);
  const overall = aggregates[0]?.overall?.[0];
  const results = status === 'all' ? all : all.filter((department) => department.status === status);

  return {
    status,
    summary: {
      totalWorked: overall?.totalWorked || 0,
      overallAvg: overall ? Math.round(overall.avg) : 0,
      departments: all.length,
      started: all.filter((department) => department.worked > 0).length,
      certified: count('certified'),
    },
    filters: FILTERS.map((filter) => ({ ...filter, count: count(filter.key) })),
    results,
    totalResults: results.length,
  };
};

module.exports = { getMyProgress };
