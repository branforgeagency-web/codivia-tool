const { rateLimit } = require('express-rate-limit');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(httpStatus.TOO_MANY_REQUESTS, message)),
    ...extra,
  });

const loginLimiter = limiter(15 * 60 * 1000, 10, 'Too many failed login attempts. Try again in 15 minutes.', {
  skipSuccessfulRequests: true,
});
const refreshLimiter = limiter(15 * 60 * 1000, 60, 'Too many token refresh requests. Try again later.');

module.exports = { loginLimiter, refreshLimiter };
