// Admin Departments page and its "Manage allocation" screen.
const { DEPARTMENT_GROUPS } = require('./departments');

// Filter tabs, in display order. 'all' means no group filter.
const DEPARTMENT_FILTERS = Object.freeze([
  { key: 'all', label: 'All departments' },
  { key: DEPARTMENT_GROUPS.SPECIALTY, label: 'Specialty tracks' },
  { key: DEPARTMENT_GROUPS.SETTING, label: 'Setting domains' },
]);
const DEPARTMENT_FILTER_KEYS = Object.freeze(DEPARTMENT_FILTERS.map((f) => f.key));

const ADMIN_DEPARTMENT_SORT_FIELDS = Object.freeze(['order', 'name', 'pool', 'allocated', 'available', 'students']);
const ADMIN_DEPARTMENT_LIMITS = Object.freeze({ search: 100, defaultLimit: 10, maxLimit: 100 });

// Students listed on the Manage allocation screen.
const ALLOCATION_FILTERS = Object.freeze(['all', 'assigned', 'unassigned']);
const ALLOCATION_LIMITS = Object.freeze({ search: 100, defaultLimit: 10, maxLimit: 200, bulkMax: 500 });

module.exports = {
  DEPARTMENT_FILTERS,
  DEPARTMENT_FILTER_KEYS,
  ADMIN_DEPARTMENT_SORT_FIELDS,
  ADMIN_DEPARTMENT_LIMITS,
  ALLOCATION_FILTERS,
  ALLOCATION_LIMITS,
};
