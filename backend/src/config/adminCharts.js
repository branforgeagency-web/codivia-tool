// Admin Browse Charts page.
const { DIFFICULTIES } = require('../models/chart.model');

// Level / status tabs on a department's chart list, in display order. 'all' means no filter.
const CHART_STATUS_FILTERS = Object.freeze([
  { key: 'all', label: 'All' },
  ...DIFFICULTIES.map((d) => ({ key: d, label: d.charAt(0).toUpperCase() + d.slice(1) })),
  { key: 'handwritten', label: 'Handwritten' },
]);
const CHART_STATUS_KEYS = Object.freeze(CHART_STATUS_FILTERS.map((f) => f.key));

// position = chart number within the department (CARDIO-0001 is 1); difficulty sorts beginner → advanced.
const CHART_SORT_FIELDS = Object.freeze(['position', 'title', 'patient', 'difficulty']);
const CHART_LIMITS = Object.freeze({ search: 100, defaultLimit: 10, maxLimit: 100 });
const CHART_DEPARTMENT_LIMITS = Object.freeze({ search: 100, defaultLimit: 9, maxLimit: 100 });

module.exports = { CHART_STATUS_FILTERS, CHART_STATUS_KEYS, CHART_SORT_FIELDS, CHART_LIMITS, CHART_DEPARTMENT_LIMITS };
