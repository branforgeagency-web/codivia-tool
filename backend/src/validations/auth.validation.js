const Joi = require('joi');
const { USER_LIMITS } = require('../config/users');
const { PASSWORD_POLICY } = require('../config/passwordPolicy');
const { strongPassword } = require('./custom.validation');

const refreshToken = Joi.string().trim().max(2048).required();

// No role field: sign-up always creates a student.
const register = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(USER_LIMITS.name).required(),
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email).required(),
    password: Joi.string().custom(strongPassword).required(),
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
