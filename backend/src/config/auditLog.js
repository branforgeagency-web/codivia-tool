// Audit log: every change an admin makes (students, allocations, charts, uploads, departments,
// chart work). Entries are written once and never edited or deleted from the app.

// Groups shown as tabs on the Audit Log page.
const AUDIT_CATEGORIES = Object.freeze([
  { key: 'students', label: 'Students' },
  { key: 'allocations', label: 'Allocations' },
  { key: 'charts', label: 'Charts' },
  { key: 'departments', label: 'Departments' },
  { key: 'work', label: 'Chart work' },
]);
const AUDIT_CATEGORY_KEYS = Object.freeze(AUDIT_CATEGORIES.map((c) => c.key));

// action key -> { category, label }. The key is what is stored on each entry.
const AUDIT_ACTIONS = Object.freeze({
  'student.create': { category: 'students', label: 'Added student' },
  'student.update': { category: 'students', label: 'Edited student' },
  'student.disable': { category: 'students', label: 'Disabled student' },
  'student.enable': { category: 'students', label: 'Enabled student' },
  'student.delete': { category: 'students', label: 'Deleted student' },

  'allocation.student': { category: 'allocations', label: 'Set student allocations' },
  'allocation.bulk': { category: 'allocations', label: 'Bulk allocated' },
  'allocation.department': { category: 'allocations', label: 'Saved department allocations' },
  'allocation.set': { category: 'allocations', label: 'Set allocation' },
  'allocation.remove': { category: 'allocations', label: 'Removed allocation' },

  'chart.edit': { category: 'charts', label: 'Edited chart' },
  'chart.encounterType': { category: 'charts', label: 'Changed encounter type' },
  'upload.create': { category: 'charts', label: 'Uploaded chart' },
  'upload.update': { category: 'charts', label: 'Edited upload' },
  'upload.publish': { category: 'charts', label: 'Published chart' },
  'upload.unpublish': { category: 'charts', label: 'Moved chart to draft' },
  'upload.delete': { category: 'charts', label: 'Deleted upload' },

  'department.create': { category: 'departments', label: 'Created department' },
  'department.update': { category: 'departments', label: 'Edited department' },
  'department.delete': { category: 'departments', label: 'Deleted department' },

  'query.answer': { category: 'work', label: 'Answered physician query' },
  'work.return': { category: 'work', label: 'Returned chart to student' },
  'work.resolve': { category: 'work', label: 'Resolved transfer' },
  'work.note': { category: 'work', label: 'Added note' },
});
const AUDIT_ACTION_KEYS = Object.freeze(Object.keys(AUDIT_ACTIONS));

const AUDIT_LIMITS = Object.freeze({ summary: 300, search: 100, defaultLimit: 20, maxLimit: 100 });

module.exports = { AUDIT_CATEGORIES, AUDIT_CATEGORY_KEYS, AUDIT_ACTIONS, AUDIT_ACTION_KEYS, AUDIT_LIMITS };
