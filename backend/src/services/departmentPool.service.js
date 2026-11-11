const { Department, Chart, Allocation, User } = require('../models');
const { ROLES } = require('../config/roles');
const { USER_STATUS } = require('../config/userStatus');
const { DEPARTMENT_POOL_LIMITS } = require('../config/departmentPools');

// { CARDIO: 600, ... }: charts per department.
const countCharts = async () => {
  const rows = await Chart.aggregate([{ $group: { _id: '$dept', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

// { CARDIO: 120, ... }: charts assigned to students, each range clamped to the department's pool.
const countAllocated = async (pools) => {
  const ranges = await Allocation.aggregate([{ $group: { _id: { dept: '$dept', start: '$start', end: '$end' }, n: { $sum: 1 } } }]);
  const allocated = {};
  ranges.forEach(({ _id: { dept, start, end }, n }) => {
    const pool = pools[dept] || 0;
    if (!pool) return;
    const from = Math.min(start, pool);
    const to = Math.max(from, Math.min(end, pool));
    allocated[dept] = (allocated[dept] || 0) + (to - from + 1) * n;
  });
  return allocated;
};

// The Department Chart Pools list: every department that has charts, with the same columns as the
// admin Overview table. Students can share charts, so `allocated` can exceed `pool` and
// `available` can go negative.
// `analytics` feeds the Overview stat cards. It is worked out live from the database on every call
// and covers every department, whatever the search or page.
const queryPools = async ({ search, sortBy = 'order', order = 'asc', page = 1, limit = DEPARTMENT_POOL_LIMITS.defaultLimit }) => {
  const [departments, pools, students] = await Promise.all([
    Department.find().select('name elements order').lean(),
    countCharts(),
    User.countDocuments({ role: ROLES.STUDENT, status: USER_STATUS.ACTIVE, deletedAt: null }),
  ]);
  const allocated = await countAllocated(pools);

  const all = departments
    .filter((d) => pools[d._id] > 0)
    .map((d) => {
      const used = allocated[d._id] || 0;
      return { key: d._id, name: d.name, elements: d.elements, pool: pools[d._id], allocated: used, available: pools[d._id] - used, order: d.order };
    });

  const term = (search || '').toLowerCase();
  const matched = term ? all.filter((d) => d.key.toLowerCase().includes(term) || d.name.toLowerCase().includes(term)) : all;
  const dir = order === 'asc' ? 1 : -1;
  matched.sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : a[sortBy] - b[sortBy]) * dir || a.order - b.order);

  const sum = (field) => all.reduce((n, d) => n + d[field], 0);
  return {
    results: matched.slice((page - 1) * limit, page * limit).map(({ order: _order, ...row }) => row),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    analytics: {
      departments: all.length, // departments that have charts ("coding domains")
      totalPool: sum('pool'), // charts across those departments
      allocated: sum('allocated'), // charts assigned to students
      available: sum('available'),
      students: students, // active student accounts
    },
  };
};

module.exports = { queryPools };
