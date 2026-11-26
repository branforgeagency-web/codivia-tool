const { PASSWORD_POLICY, isStrongPassword } = require('../config/passwordPolicy');
const { PHONE_INDIA } = require('../config/users');

const objectId = (value, helpers) =>
  /^[0-9a-fA-F]{24}$/.test(value) ? value : helpers.message('{{#label}} must be a valid id');

const strongPassword = (value, helpers) =>
  isStrongPassword(value) ? value : helpers.message(PASSWORD_POLICY.message);

// Contact number (Indian mobile): same rule as the sign-up form (Frontend/src/utils/phone.js).
// Returns the number in one format: "+91 98765 43210".
const phoneNumber = (value, helpers) => {
  const compact = value.replace(/[\s()-]/g, '');
  const m = PHONE_INDIA.exec(compact);
  if (!m) return helpers.message('Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8 or 9)');
  return '+91 ' + m[1].slice(0, 5) + ' ' + m[1].slice(5);
};

module.exports = { objectId, strongPassword, phoneNumber };
