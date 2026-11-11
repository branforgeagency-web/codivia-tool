const { Department } = require('../models');
const { DEPARTMENT_GROUPS } = require('../config/departments');
const { DEPARTMENT_FILTERS } = require('../config/adminDepartments');
const { countCharts, summarize } = require('./allocation.service');

// Admin Departments page: every department that has charts, as cards, with the page statistics
// and filter tab counts. Statistics and counts always cover every department; the group filter,
// search, sort and page only change `results`. Everything is read live from the database.
const queryDepartments = async ({ group = 'all', search, sortBy = 'order', order = 'asc', page = 1, limit = 9 }) => {
  const [departments, pools] = await Promise.all([Department.find().select('name icon group elements order isActive').lean(), countCharts()]);
  const { byDept, assignedStudents, students } = await summarize(pools);

  const all = departments
    .filter((d) => pools[d._id] > 0)
    .map((d) => {
      const { allocated = 0, students: deptStudents = 0 } = byDept[d._id] || {};
      return {
        key: d._id,
        name: d.name,
        icon: d.icon,
        group: d.group,
        elements: d.elements,
        isActive: d.isActive,
        pool: pools[d._id],
        allocated,
        available: pools[d._id] - allocated,
        students: deptStudents,
        order: d.order,
      };
    });

  const inGroup = (g) => (g === 'all' ? all : all.filter((d) => d.group === g));
  const term = (search || '').toLowerCase();
  const matched = inGroup(group).filter((d) => !term || d.key.toLowerCase().includes(term) || d.name.toLowerCase().includes(term));
  const dir = order === 'asc' ? 1 : -1;
  matched.sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : a[sortBy] - b[sortBy]) * dir || a.order - b.order);

  const sum = (field) => all.reduce((n, d) => n + d[field], 0);
  const chartPool = sum('pool');
  const allocated = sum('allocated');

  return {
    results: matched.slice((page - 1) * limit, page * limit).map(({ order: _order, ...row }) => row),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(matched.length / limit)),
    totalResults: matched.length,
    filters: DEPARTMENT_FILTERS.map((f) => ({ ...f, count: inGroup(f.key).length })),
    statistics: {
      departments: all.length,
      specialty: inGroup(DEPARTMENT_GROUPS.SPECIALTY).length,
      setting: inGroup(DEPARTMENT_GROUPS.SETTING).length,
      chartPool,
      allocated,
      allocatedPercent: chartPool ? Math.round((allocated / chartPool) * 100) : 0,
      available: chartPool - allocated,
      studentsAssigned: assignedStudents, // students with at least one department
      students, // all active students
    },
  };
};

module.exports = { queryDepartments };
