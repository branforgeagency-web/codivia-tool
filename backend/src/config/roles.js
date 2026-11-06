const ROLES = Object.freeze({
  ADMIN: 'admin',
  AUDITOR: 'auditor',
  STUDENT: 'student',
});

const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.AUDITOR]: 'Auditor',
  [ROLES.STUDENT]: 'Student',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));
const MANAGER_ROLES = Object.freeze([ROLES.ADMIN]);
const LOCKED_ROLES = Object.freeze([ROLES.ADMIN]); // always full access, cannot be edited
const ASSIGNABLE_ROLES = Object.freeze(ALL_ROLES.filter((r) => !LOCKED_ROLES.includes(r)));

const roleLabel = (role) => ROLE_LABELS[role] || role;

module.exports = { ROLES, ROLE_LABELS, ALL_ROLES, MANAGER_ROLES, LOCKED_ROLES, ASSIGNABLE_ROLES, roleLabel };
