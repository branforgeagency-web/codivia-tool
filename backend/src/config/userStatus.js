const USER_STATUS = Object.freeze({ ACTIVE: 'active', DISABLED: 'disabled' });
const ALL_USER_STATUSES = Object.freeze(Object.values(USER_STATUS));

module.exports = { USER_STATUS, ALL_USER_STATUSES };
