const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  maxLength: 72,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
  message: 'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number and a special character',
});

const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= PASSWORD_POLICY.minLength &&
  Buffer.byteLength(password, 'utf8') <= PASSWORD_POLICY.maxLength &&
  PASSWORD_POLICY.pattern.test(password);

module.exports = { PASSWORD_POLICY, isStrongPassword };
