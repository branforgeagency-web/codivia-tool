const { tokenService, userService } = require('../services');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const unauthenticated = () => new ApiError(httpStatus.UNAUTHORIZED, 'Please sign in to continue');

const readBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

// Tokens issued before the last password change are no longer valid.
const issuedBeforePasswordChange = (user, payload) =>
  Boolean(user.passwordChangedAt) && user.passwordChangedAt.getTime() >= payload.iat * 1000;

// auth() → any signed-in active user ; auth(...roles) → only those roles.
// Role is read from the DB, not the token, so role changes apply immediately.
const auth =
  (...allowedRoles) =>
  async (req, res, next) => {
    const token = readBearerToken(req);
    const payload = token && tokenService.verifyAccessToken(token);
    if (!payload) throw unauthenticated();

    const user = await userService.getUserById(payload.sub);
    if (!user || issuedBeforePasswordChange(user, payload)) throw unauthenticated();
    if (!user.isActive()) throw new ApiError(httpStatus.FORBIDDEN, 'Your account is disabled. Contact an administrator.');
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, "You don't have permission to do this");
    }

    req.user = user;
    next();
  };

module.exports = auth;
