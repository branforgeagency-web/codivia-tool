const USER_LIMITS = Object.freeze({ name: 100, email: 254 });
const USER_SORT_FIELDS = Object.freeze(['name', 'email', 'role', 'createdAt', 'lastLoginAt']);

module.exports = { USER_LIMITS, USER_SORT_FIELDS };
