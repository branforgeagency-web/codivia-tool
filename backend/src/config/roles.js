// Three roles: admin (manages everything), student (signs up and codes charts) and auditor
// (created by an admin; reviews the submitted charts of the students assigned to them per
// department, and can adjust the score). Every role list below (user model, validation, access
// matrix) follows ROLES.
const ROLES = Object.freeze({
  ADMIN: 'admin',
  STUDENT: 'student',
  AUDITOR: 'auditor',
});

const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.STUDENT]: 'Student',
  [ROLES.AUDITOR]: 'Auditor',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));
const MANAGER_ROLES = Object.freeze([ROLES.ADMIN]);
const LOCKED_ROLES = Object.freeze([ROLES.ADMIN]); // always full access, cannot be edited
const ASSIGNABLE_ROLES = Object.freeze(ALL_ROLES.filter((r) => !LOCKED_ROLES.includes(r)));

const roleLabel = (role) => ROLE_LABELS[role] || role;

module.exports = { ROLES, ROLE_LABELS, ALL_ROLES, MANAGER_ROLES, LOCKED_ROLES, ASSIGNABLE_ROLES, roleLabel };
