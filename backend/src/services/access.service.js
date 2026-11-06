const { RolePermission } = require('../models');
const { ALL_ROLES, LOCKED_ROLES, roleLabel } = require('../config/roles');
const { ALL_ACTIONS, MODULES, MODULE_LIST } = require('../config/modules');
const { FULL, NONE, defaultPermissions } = require('../config/access');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const pick = (row) => Object.fromEntries(ALL_ACTIONS.map((action) => [action, Boolean(row[action])]));
const samePermissions = (a, b) => ALL_ACTIONS.every((action) => a[action] === b[action]);
const isLocked = (role) => LOCKED_ROLES.includes(role);

const resolve = (role, moduleKey, override) => {
  if (isLocked(role)) return { ...FULL };
  return override ? pick(override) : { ...defaultPermissions(role, moduleKey) };
};

const getPermissions = async (role, moduleKey) => {
  if (isLocked(role)) return { ...FULL };
  const override = await RolePermission.findOne({ role, module: moduleKey }).lean();
  return resolve(role, moduleKey, override);
};

const can = async (role, moduleKey, action) => Boolean((await getPermissions(role, moduleKey))[action]);

// Full role × module grid for the Access Control screen.
const getMatrix = async () => {
  const overrides = await RolePermission.find().lean();
  const byKey = new Map(overrides.map((row) => [`${row.role}:${row.module}`, row]));

  const permissions = Object.fromEntries(
    ALL_ROLES.map((role) => [
      role,
      Object.fromEntries(MODULE_LIST.map(({ key }) => [key, resolve(role, key, byKey.get(`${role}:${key}`))])),
    ])
  );

  return {
    roles: ALL_ROLES.map((role) => ({ key: role, label: roleLabel(role), locked: isLocked(role) })),
    modules: MODULE_LIST,
    actions: ALL_ACTIONS,
    permissions,
  };
};

const updatePermission = async (role, moduleKey, changes, actor) => {
  if (isLocked(role)) {
    throw new ApiError(httpStatus.FORBIDDEN, `The ${roleLabel(role)} role always has full access and can't be changed`);
  }

  let next = { ...(await getPermissions(role, moduleKey)), ...changes };
  // add / edit / delete need view; turning view off turns everything off.
  if (changes.view === false) next = { ...NONE };
  else if (next.add || next.edit || next.delete) next.view = true;

  if (moduleKey === MODULES.ACCESS_CONTROL && role === actor.role && !(next.view && next.edit)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You can't remove your own Access Control access");
  }

  // Only differences from the default are stored.
  if (samePermissions(next, defaultPermissions(role, moduleKey))) {
    await RolePermission.deleteOne({ role, module: moduleKey });
  } else {
    await RolePermission.findOneAndUpdate(
      { role, module: moduleKey },
      { ...next, updatedBy: actor._id },
      { upsert: true, runValidators: true }
    );
  }
  return next;
};

module.exports = { getPermissions, can, getMatrix, updatePermission };
