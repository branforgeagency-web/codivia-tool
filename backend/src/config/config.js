const env = require('./env');

const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  mongo: { url: env.MONGODB_URL },
  cors: {
    origins: env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
  },
  jwt: {
    issuer: 'codivia',
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresMinutes: env.JWT_ACCESS_EXPIRES_MINUTES,
    refreshExpiresDays: env.JWT_REFRESH_EXPIRES_DAYS,
  },
  bcrypt: { saltRounds: env.BCRYPT_SALT_ROUNDS },
  seedAdmin: { name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
};

module.exports = Object.freeze(config);
