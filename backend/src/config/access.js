const { LOCKED_ROLES, MANAGER_ROLES } = require('./roles');
const { findModule } = require('./modules');

const permissionSet = (view, add, edit, del) => Object.freeze({ view, add, edit, delete: del });

const FULL = permissionSet(true, true, true, true);
const NONE = permissionSet(false, false, false, false);
const VIEW_ONLY = permissionSet(true, false, false, false);
const SELF_SERVICE = permissionSet(true, true, false, true);

// Default rules. RolePermission rows only store overrides of these.
const defaultPermissions = (role, moduleKey) => {
  const mod = findModule(moduleKey);
  if (!mod) return NONE;
  if (LOCKED_ROLES.includes(role)) return FULL;
  if (mod.adminOnly) return NONE;
  if (MANAGER_ROLES.includes(role)) return FULL;
  if (mod.restricted) return NONE;
  if (mod.selfService) return SELF_SERVICE;
  return VIEW_ONLY;
};

module.exports = { FULL, NONE, VIEW_ONLY, SELF_SERVICE, defaultPermissions };
