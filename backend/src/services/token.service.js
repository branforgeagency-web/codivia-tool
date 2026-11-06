const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { TOKEN_TYPES } = require('../config/tokens');
const { Token } = require('../models');
const { sha256 } = require('../utils/hash');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const ALGORITHM = 'HS256';

const sessionExpired = () => new ApiError(httpStatus.UNAUTHORIZED, 'Your session has expired. Please sign in again.');

const sign = (payload, secret, expiresAt, options = {}) =>
  jwt.sign({ ...payload, exp: Math.floor(expiresAt.getTime() / 1000) }, secret, {
    issuer: config.jwt.issuer,
    algorithm: ALGORITHM,
    ...options,
  });

// Returns the payload, or null when the token is invalid, expired or of the wrong type.
const verify = (token, secret, type) => {
  try {
    const payload = jwt.verify(token, secret, { issuer: config.jwt.issuer, algorithms: [ALGORITHM] });
    return payload.type === type ? payload : null;
  } catch {
    return null;
  }
};

const verifyAccessToken = (token) => verify(token, config.jwt.accessSecret, TOKEN_TYPES.ACCESS);
const verifyRefreshToken = (token) => verify(token, config.jwt.refreshSecret, TOKEN_TYPES.REFRESH);

const generateAccessToken = (user) => {
  const expiresAt = new Date(Date.now() + config.jwt.accessExpiresMinutes * MINUTE_MS);
  const token = sign({ sub: user.id, role: user.role, type: TOKEN_TYPES.ACCESS }, config.jwt.accessSecret, expiresAt);
  return { token, expiresAt };
};

const generateRefreshToken = async (user, family, meta = {}) => {
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresDays * DAY_MS);
  const token = sign({ sub: user.id, type: TOKEN_TYPES.REFRESH, fam: family }, config.jwt.refreshSecret, expiresAt, {
    jwtid: crypto.randomUUID(),
  });
  await Token.create({
    tokenHash: sha256(token),
    user: user._id,
    family,
    expiresAt,
    createdByIp: meta.ip || '',
    userAgent: meta.userAgent || '',
  });
  return { token, expiresAt };
};

// A new family starts at login; refreshes keep the same family.
const generateAuthTokens = async (user, meta = {}, family = crypto.randomUUID()) => ({
  access: generateAccessToken(user),
  refresh: await generateRefreshToken(user, family, meta),
});

const revokeFamily = (family) => Token.updateMany({ family, revokedAt: null }, { revokedAt: new Date() });

const revokeUserTokens = (userId) => Token.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });

// Marks a refresh token used (atomically) and returns its record.
// A token that was already used means it may have been stolen, so the whole family is revoked.
const consumeRefreshToken = async (token) => {
  if (!verifyRefreshToken(token)) throw sessionExpired();
  const tokenHash = sha256(token);
  const now = new Date();

  const stored = await Token.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { revokedAt: now },
    { returnDocument: 'after' }
  );
  if (stored) return stored;

  const reused = await Token.findOne({ tokenHash, revokedAt: { $ne: null } });
  if (reused) await revokeFamily(reused.family);
  throw sessionExpired();
};

const markReplaced = (stored, newRefreshToken) =>
  Token.updateOne({ _id: stored._id }, { replacedByHash: sha256(newRefreshToken) });

// Logout: works even with an expired token, and never says whether the token existed.
const revokeByToken = async (token) => {
  const stored = await Token.findOne({ tokenHash: sha256(token) });
  if (stored) await revokeFamily(stored.family);
};

module.exports = {
  verifyAccessToken,
  verifyRefreshToken,
  generateAuthTokens,
  consumeRefreshToken,
  markReplaced,
  revokeFamily,
  revokeUserTokens,
  revokeByToken,
};
