const Joi = require('joi');
const { USER_LIMITS } = require('../config/users');
const { PASSWORD_POLICY } = require('../config/passwordPolicy');

const refreshToken = Joi.string().trim().max(2048).required();

const login = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().max(USER_LIMITS.email).required(),
    // No strength check here: old passwords must still be able to sign in.
    password: Joi.string().max(PASSWORD_POLICY.maxLength).required(),
  }),
};

const refreshTokens = { body: Joi.object({ refreshToken }) };
const logout = { body: Joi.object({ refreshToken }) };

module.exports = { login, refreshTokens, logout };
