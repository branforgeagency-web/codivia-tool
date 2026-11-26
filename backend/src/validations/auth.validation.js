const Joi = require('joi');
const { USER_LIMITS } = require('../config/users');
const { PASSWORD_POLICY } = require('../config/passwordPolicy');
const { strongPassword, phoneNumber } = require('./custom.validation');

const refreshToken = Joi.string().trim().max(2048).required();

// No role field: sign-up always creates a student.
const register = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(USER_LIMITS.name).required(),
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email).required(),
    password: Joi.string().custom(strongPassword).required(),
    phone: Joi.string().trim().max(USER_LIMITS.phone).custom(phoneNumber).required()
      .messages({ 'string.empty': 'Enter your contact number', 'any.required': 'Enter your contact number' }),
    organization: Joi.string().trim().min(2).max(USER_LIMITS.organization).required()
      .messages({ 'string.empty': 'Enter your company or college', 'any.required': 'Enter your company or college', 'string.min': 'Enter your company or college' }),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email).required(),
    // No strength check here: old passwords must still be able to sign in.
    password: Joi.string().max(PASSWORD_POLICY.maxLength).required(),
  }),
};

const refreshTokens = { body: Joi.object({ refreshToken }) };
const logout = { body: Joi.object({ refreshToken }) };

module.exports = { register, login, refreshTokens, logout };
