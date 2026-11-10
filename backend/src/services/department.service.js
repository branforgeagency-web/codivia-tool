const { Department, Chart } = require('../models');
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

module.exports = { getMeta, queryDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
