// Admin Overview > Department Chart Pools list.
const DEPARTMENT_POOL_SORT_FIELDS = Object.freeze(['order', 'name', 'pool', 'allocated', 'available']);
const DEPARTMENT_POOL_LIMITS = Object.freeze({ search: 100, defaultLimit: 10, maxLimit: 100 });

module.exports = { DEPARTMENT_POOL_SORT_FIELDS, DEPARTMENT_POOL_LIMITS };
