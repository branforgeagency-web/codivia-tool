const ACTIONS = Object.freeze({ VIEW: 'view', ADD: 'add', EDIT: 'edit', DELETE: 'delete' });
const ALL_ACTIONS = Object.freeze(Object.values(ACTIONS));

const MODULES = Object.freeze({
  USERS: 'users',
  ACCESS_CONTROL: 'access-control',
  DEPARTMENTS: 'departments',
  CODES: 'codes',
  RESUMES: 'resumes',
  CHART_RESULTS: 'chart-results',
  CERTIFICATES: 'certificates',
});

// selfService: staff manage their own records ; restricted: closed by default ; adminOnly: Admin only
// ownRecords: full access by default, but only to records the user owns (enforced in the service)
const MODULE_LIST = Object.freeze([
  { key: MODULES.ACCESS_CONTROL, label: 'Access Control', restricted: true },
  { key: MODULES.USERS, label: 'Users', restricted: true, adminOnly: true },
  // Not restricted: students and auditors can view (active departments only); Admin manages.
  { key: MODULES.DEPARTMENTS, label: 'Departments' },
  // Not restricted: every signed-in role can search codes (read-only reference data).
  { key: MODULES.CODES, label: 'Code Search' },
  // ownRecords: every role adds / edits / deletes its own resumes; the service hides other people's.
  { key: MODULES.RESUMES, label: 'Resumes', ownRecords: true },
  { key: MODULES.CHART_RESULTS, label: 'Chart Results', ownRecords: true },
  // Not restricted: view only, and the service limits students to their own. Issued automatically.
  { key: MODULES.CERTIFICATES, label: 'Certificates' },
]);

const MODULE_KEYS = Object.freeze(MODULE_LIST.map((m) => m.key));
const findModule = (key) => MODULE_LIST.find((m) => m.key === key);

module.exports = { ACTIONS, ALL_ACTIONS, MODULES, MODULE_LIST, MODULE_KEYS, findModule };
