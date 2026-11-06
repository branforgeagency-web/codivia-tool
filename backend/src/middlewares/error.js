const mongoose = require('mongoose');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const notFound = (req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`));
};

const fromMongooseValidation = (err) =>
  new ApiError(
    httpStatus.BAD_REQUEST,
    'Validation failed',
    Object.values(err.errors).map((item) => ({ field: item.path, message: item.message }))
  );

const fromDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return new ApiError(httpStatus.CONFLICT, `${field} already exists`, [{ field, message: `${field} already exists` }]);
};

// Turns any thrown error into an ApiError.
const errorConverter = (err, req, res, next) => {
  if (err instanceof ApiError) return next(err);
  if (err instanceof mongoose.Error.ValidationError) return next(fromMongooseValidation(err));
  if (err instanceof mongoose.Error.CastError) return next(new ApiError(httpStatus.BAD_REQUEST, `Invalid ${err.path}`));
  if (err.code === 11000) return next(fromDuplicateKey(err));
  if (err.type === 'entity.parse.failed') return next(new ApiError(httpStatus.BAD_REQUEST, 'Malformed JSON in request body'));
  if (err.type === 'entity.too.large') return next(new ApiError(httpStatus.PAYLOAD_TOO_LARGE, 'Request body is too large'));

  const statusCode = err.statusCode || err.status || httpStatus.INTERNAL_SERVER_ERROR;
  const message = statusCode < 500 && err.message ? err.message : 'Internal server error';
  return next(new ApiError(statusCode, message, undefined, false));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const { statusCode, message, details, isOperational } = err;

  if (!isOperational || statusCode >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err.stack);

  const body = { code: statusCode, message };
  if (details) body.details = details;
  if (!config.isProduction && !isOperational) body.stack = err.stack;
  return res.status(statusCode).json(body);
};

module.exports = { notFound, errorConverter, errorHandler };
