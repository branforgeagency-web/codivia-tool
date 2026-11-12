const { Allocation, Chart, ChartResult, Department } = require('../models');

// ---------- Student "My Charts": the departments allocated to the signed-in student ----------
// Never returns answer keys or chart records, only counts and the allocated range.

const average = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0);

// The allocated range clamped to the department's pool (same as allocationService.rangeCount).
const clampRange = (start, end, pool) => {
  if (!pool) return null;
  const from = Math.min(start, pool);
  return { start: from, end: Math.max(from, Math.min(end, pool)) };
};

const statusOf = (assigned, worked) => (assigned > 0 && worked >= assigned ? 'complete' : worked ? 'active' : 'new');

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
    { $project: { _id: 0, dept: 1, accuracy: 1, position: { $arrayElemAt: ['$chart.position', 0] } } },
  ]);

// Cards (one per allocated, active department with charts) + the stat tiles.
// worked / avg only count charts inside the student's allocated range.
const getMyDepartments = async (student) => {
  const allocations = await Allocation.find({ student: student._id }).select('dept start end').lean();
  const keys = allocations.map((a) => a.dept);

  const [departments, pools, scores] = keys.length
    ? await Promise.all([
        Department.find({ _id: { $in: keys }, isActive: true }).select('name icon group elements order').lean(),
        Chart.aggregate([{ $match: { dept: { $in: keys } } }, { $group: { _id: '$dept', n: { $sum: 1 } } }]),
        scoresWithPosition(student._id, keys),
      ])
    : [[], [], []];

  const poolByDept = Object.fromEntries(pools.map((p) => [p._id, p.n]));
  const deptByKey = new Map(departments.map((d) => [d._id, d]));

  const results = allocations
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

  const sum = (field) => results.reduce((n, d) => n + d[field], 0);
  return {
    results,
    statistics: {
      assigned: sum('assigned'),
      worked: sum('worked'),
      remaining: sum('remaining'),
      departments: results.length,
    },
  };
};

module.exports = { getMyDepartments };
