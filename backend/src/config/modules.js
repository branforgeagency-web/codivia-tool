const ACTIONS = Object.freeze({ VIEW: 'view', ADD: 'add', EDIT: 'edit', DELETE: 'delete' });
const ALL_ACTIONS = Object.freeze(Object.values(ACTIONS));

const MODULES = Object.freeze({
  USERS: 'users',
  ACCESS_CONTROL: 'access-control',
  DEPARTMENTS: 'departments',
  CODES: 'codes',
});

// selfService: staff manage their own records ; restricted: closed by default ; adminOnly: Admin only
const MODULE_LIST = Object.freeze([
  { key: MODULES.ACCESS_CONTROL, label: 'Access Control', restricted: true },
  { key: MODULES.USERS, label: 'Users', restricted: true, adminOnly: true },
  // Not restricted: students and auditors can view (active departments only); Admin manages.
  { key: MODULES.DEPARTMENTS, label: 'Departments' },
  // Not restricted: every signed-in role can search codes (read-only reference data).
  { key: MODULES.CODES, label: 'Code Search' },
]);

const MODULE_KEYS = Object.freeze(MODULE_LIST.map((m) => m.key));
const findModule = (key) => MODULE_LIST.find((m) => m.key === key);

module.exports = { ACTIONS, ALL_ACTIONS, MODULES, MODULE_LIST, MODULE_KEYS, findModule };
