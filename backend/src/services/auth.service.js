const { User } = require('../models');
const tokenService = require('./token.service');
const userService = require('./user.service');
const { verifyPassword, needsRehash, hashPassword } = require('../utils/password');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const login = async (email, password, meta) => {
  const user = await userService.getUserByEmailWithPassword(email);
  // Always runs bcrypt (dummy hash when the user doesn't exist), and the same message either way.
  const passwordOk = await verifyPassword(password, user?.password);
  if (!user || !passwordOk) throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  if (!user.isActive()) throw new ApiError(httpStatus.FORBIDDEN, 'Your account is disabled. Contact an administrator.');

  // updateOne skips the save hook, so a rehash doesn't count as a password change.
  const changes = { lastLoginAt: new Date() };
  if (needsRehash(user.password)) changes.password = await hashPassword(password);
  await User.updateOne({ _id: user._id }, changes);
  user.lastLoginAt = changes.lastLoginAt;

  const tokens = await tokenService.generateAuthTokens(user, meta);
  return { user, tokens };
};

// Rotation: the old refresh token is used up and a new pair is issued in the same family.
const refreshAuth = async (refreshToken, meta) => {
  const stored = await tokenService.consumeRefreshToken(refreshToken);
  const user = await userService.getUserById(stored.user);
  if (!user || !user.isActive()) {
    await tokenService.revokeFamily(stored.family);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please sign in to continue');
  }

  const tokens = await tokenService.generateAuthTokens(user, meta, stored.family);
  await tokenService.markReplaced(stored, tokens.refresh.token);
  return { user, tokens };
};

const logout = (refreshToken) => tokenService.revokeByToken(refreshToken);

const logoutAll = (user) => tokenService.revokeUserTokens(user._id);

module.exports = { login, refreshAuth, logout, logoutAll };
