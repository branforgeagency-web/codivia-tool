const { PASSWORD_POLICY, isStrongPassword } = require('../config/passwordPolicy');

const objectId = (value, helpers) =>
  /^[0-9a-fA-F]{24}$/.test(value) ? value : helpers.message('{{#label}} must be a valid id');

const strongPassword = (value, helpers) =>
  isStrongPassword(value) ? value : helpers.message(PASSWORD_POLICY.message);

module.exports = { objectId, strongPassword };
