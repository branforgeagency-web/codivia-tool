const ACTIONS = Object.freeze({ VIEW: 'view', ADD: 'add', EDIT: 'edit', DELETE: 'delete' });
const ALL_ACTIONS = Object.freeze(Object.values(ACTIONS));

const MODULES = Object.freeze({
  USERS: 'users',
  ACCESS_CONTROL: 'access-control',
});

// selfService: staff manage their own records ; restricted: closed by default ; adminOnly: Admin only
const MODULE_LIST = Object.freeze([
  { key: MODULES.ACCESS_CONTROL, label: 'Access Control', restricted: true },
  { key: MODULES.USERS, label: 'Users', restricted: true, adminOnly: true },
]);

const MODULE_KEYS = Object.freeze(MODULE_LIST.map((m) => m.key));
const findModule = (key) => MODULE_LIST.find((m) => m.key === key);

module.exports = { ACTIONS, ALL_ACTIONS, MODULES, MODULE_LIST, MODULE_KEYS, findModule };
