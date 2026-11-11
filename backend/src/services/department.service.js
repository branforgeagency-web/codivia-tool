const { Department, Chart, Allocation } = require('../models');
const { MANAGER_ROLES } = require('../config/roles');
const { CODE_ELEMENTS, DEPARTMENT_GROUP_LABELS } = require('../config/departments');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isManager = (actor) => Boolean(actor) && MANAGER_ROLES.includes(actor.role);
const notFound = () => new ApiError(httpStatus.NOT_FOUND, 'Department not found');

// { CARDIO: 600, ... } for the given department keys (all departments when keys is omitted).
const countCharts = async (keys) => {
  const match = keys ? { dept: { $in: keys } } : {};
  const rows = await Chart.aggregate([{ $match: match }, { $group: { _id: '$dept', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

const withChartCount = (doc, counts) => ({ ...doc.toJSON(), chartCount: counts[doc._id] || 0 });

// Only managers see inactive departments.
const findVisible = async (key, actor) => {
  const dept = await Department.findById(key);
  if (!dept || (!dept.isActive && !isManager(actor))) throw notFound();
  return dept;
};

const getMeta = () => ({
  groups: Object.entries(DEPARTMENT_GROUP_LABELS).map(([key, label]) => ({ key, label })),
  elements: Object.entries(CODE_ELEMENTS).map(([key, label]) => ({ key, label })),
});

// Not paginated: there are only a few dozen departments.
const queryDepartments = async ({ search, group, isActive, hasCharts }, actor) => {
  const filter = {};
  if (group) filter.group = group;
  if (!isManager(actor)) filter.isActive = true;
  else if (isActive !== undefined) filter.isActive = isActive;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ _id: pattern }, { name: pattern }];
  }

  const [docs, counts] = await Promise.all([Department.find(filter).sort({ order: 1, _id: 1 }), countCharts()]);
  let results = docs.map((d) => withChartCount(d, counts));
  if (hasCharts !== undefined) results = results.filter((d) => d.chartCount > 0 === hasCharts);
  return { results, totalResults: results.length };
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

// Admin overview: every department that has charts, with its pool, allocated and available counts.
// Students can share charts, so `allocated` can exceed `pool` and `available` can go negative.
// `totals` covers all departments, whatever the search or page.
const queryPools = async ({ search, sortBy = 'order', order = 'asc', page = 1, limit = 10 }) => {
  const [departments, pools] = await Promise.all([Department.find().lean(), countCharts()]);
  const allocated = await countAllocated(pools);

  const all = departments
    .filter((d) => pools[d._id] > 0)
    .map((d) => {
      const used = allocated[d._id] || 0;
      return {
        key: d._id,
        name: d.name,
        icon: d.icon,
        elements: d.elements,
        isActive: d.isActive,
        order: d.order,
        pool: pools[d._id],
        allocated: used,
        available: pools[d._id] - used,
      };
    });

  const term = (search || '').toLowerCase();
  const matched = term ? all.filter((d) => d.key.toLowerCase().includes(term) || d.name.toLowerCase().includes(term)) : all;
  const dir = order === 'asc' ? 1 : -1;
  const sorted = [...matched].sort((a, b) => {
    const diff = sortBy === 'name' ? a.name.localeCompare(b.name) : a[sortBy] - b[sortBy];
    return diff * dir || a.order - b.order;
  });

  const sum = (field) => all.reduce((n, d) => n + d[field], 0);
  return {
    results: sorted.slice((page - 1) * limit, page * limit),
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
    totalResults: sorted.length,
    totals: { departments: all.length, pool: sum('pool'), allocated: sum('allocated'), available: sum('available') },
  };
};

const getDepartment = async (key, actor) => {
  const dept = await findVisible(key, actor);
  return withChartCount(dept, await countCharts([dept._id]));
};

const createDepartment = async ({ key, ...body }, actor) => {
  if (await Department.exists({ _id: key })) {
    const message = `A department with key ${key} already exists`;
    throw new ApiError(httpStatus.CONFLICT, message, [{ field: 'key', message }]);
  }
  // New departments go to the end of the list unless an order is given.
  if (body.order === undefined) {
    const last = await Department.findOne().sort({ order: -1 }).select('order');
    body.order = last ? last.order + 1 : 1;
  }
  const dept = await Department.create({ _id: key, ...body, createdBy: actor._id, updatedBy: actor._id });
  return withChartCount(dept, await countCharts([dept._id]));
};

const updateDepartment = async (key, updates, actor) => {
  const dept = await Department.findById(key);
  if (!dept) throw notFound();
  Object.assign(dept, updates, { updatedBy: actor._id });
  await dept.save();
  return withChartCount(dept, await countCharts([dept._id]));
};

// A department that still has charts can't be deleted (the charts would be orphaned); deactivate it instead.
const deleteDepartment = async (key) => {
  const dept = await Department.findById(key);
  if (!dept) throw notFound();
  const charts = (await countCharts([dept._id]))[dept._id] || 0;
  if (charts > 0) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `${dept.name} still has ${charts} charts. Set it inactive instead of deleting it.`
    );
  }
  await dept.deleteOne();
};

module.exports = { getMeta, queryDepartments, queryPools, getDepartment, createDepartment, updateDepartment, deleteDepartment };
