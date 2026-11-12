// Admin Students page.

// Status tabs, in display order. 'all' means no filter.
const STUDENT_STATUS_FILTERS = Object.freeze([
  { key: 'all', label: 'All students' },
  { key: 'active', label: 'Active' },
  { key: 'idle', label: 'Not started' },
  { key: 'unallocated', label: 'Unallocated' },
]);
const STUDENT_STATUS_KEYS = Object.freeze(STUDENT_STATUS_FILTERS.map((f) => f.key));

const ADMIN_STUDENT_LIMITS = Object.freeze({ search: 100, defaultLimit: 10, maxLimit: 100 });

// Bulk allocate: starter charts per department for every student with no allocation yet.
const BULK_ALLOCATION = Object.freeze({ depts: Object.freeze(['EM', 'GENSURG', 'ED_PRO']), size: 25 });

module.exports = { STUDENT_STATUS_FILTERS, STUDENT_STATUS_KEYS, ADMIN_STUDENT_LIMITS, BULK_ALLOCATION };
