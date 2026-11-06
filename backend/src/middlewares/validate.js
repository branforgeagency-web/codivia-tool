const Joi = require('joi');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const REQUEST_PARTS = ['params', 'query', 'body'];

const validate = (schema) => (req, res, next) => {
  const parts = REQUEST_PARTS.filter((part) => schema[part]);
  const shape = Object.fromEntries(parts.map((part) => [part, schema[part]]));
  const input = Object.fromEntries(parts.map((part) => [part, req[part] ?? {}]));

  const { value, error } = Joi.object(shape)
    .prefs({ errors: { label: 'key', wrap: { label: false } }, abortEarly: false, stripUnknown: true })
    .validate(input);

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.slice(1).join('.') || d.path.join('.'),
      message: d.message,
    }));
    return next(new ApiError(httpStatus.BAD_REQUEST, 'Validation failed', details));
  }

  // Express 5: req.query is a getter, so redefine instead of assigning.
  parts.forEach((part) => {
    Object.defineProperty(req, part, { value: value[part], writable: true, configurable: true, enumerable: true });
  });
  return next();
};

module.exports = validate;
