const bcrypt = require('bcryptjs');
const config = require('../config/config');

const BCRYPT_MAX_BYTES = 72;
// Compared against when the user doesn't exist, so login timing doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', config.bcrypt.saltRounds);

const hashPassword = async (password) => {
  if (typeof password !== 'string' || !password.length) throw new TypeError('Password must be a non-empty string');
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) throw new RangeError(`Password must be at most ${BCRYPT_MAX_BYTES} bytes`);
  return bcrypt.hash(password, config.bcrypt.saltRounds);
};

const verifyPassword = async (password, hash) => {
  if (typeof password !== 'string' || !password.length) return false;
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) return false;
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
};

const needsRehash = (hash) => bcrypt.getRounds(hash) !== config.bcrypt.saltRounds;

module.exports = { BCRYPT_MAX_BYTES, hashPassword, verifyPassword, needsRehash };
