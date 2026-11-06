const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env'), quiet: true });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),

  MONGODB_URL: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  CORS_ORIGIN: Joi.string().default('http://localhost:8080').description('Comma separated list of allowed origins'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .required()
    .messages({ 'any.invalid': '"JWT_REFRESH_SECRET" must be different from "JWT_ACCESS_SECRET"' }),
  JWT_ACCESS_EXPIRES_MINUTES: Joi.number().integer().min(1).max(60).default(15),
  JWT_REFRESH_EXPIRES_DAYS: Joi.number().integer().min(1).max(90).default(7),

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

  ADMIN_NAME: Joi.string().trim().max(100).default('Admin User'),
  ADMIN_EMAIL: Joi.string().trim().lowercase().email(),
  ADMIN_PASSWORD: Joi.string(),
}).unknown();

const { value: env, error } = envSchema
  .prefs({ errors: { label: 'key', wrap: { label: '"' } } })
  .validate(process.env, { abortEarly: false });

if (error) {
  const problems = error.details.map((detail) => `  - ${detail.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

module.exports = env;
