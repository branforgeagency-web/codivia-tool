# Backend Boilerplate — Node.js + Express 5 + MongoDB (Mongoose)

> **Prompt for the AI:** Set up (or extend) the backend of this project using **exactly** the folder structure, file naming, layering and code patterns described below. Do not introduce other patterns (no TypeScript, no classes for services, no per-request `try/catch` wrappers, no `catchAsync`, no extra frameworks). When I ask for a new feature/module, create it by following the **"Adding a new module"** checklist at the end. Keep code short, readable and commented only where the "why" is not obvious.

---

## 1. Tech stack

| Purpose | Package |
|---|---|
| HTTP server | `express@^5` (async errors are forwarded to the error middleware automatically — no `catchAsync` needed) |
| Database | `mongoose@^9` |
| Validation (env + requests) | `joi` |
| Auth | `jsonwebtoken` (access + refresh tokens), `bcryptjs` (passwords) |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Env file | `dotenv` |
| Dev | `nodemon` |

Plain **CommonJS** (`require` / `module.exports`), Node 20+.

---

## 2. Folder structure

```
backend/
├── .env                      # real values (git-ignored)
├── .env.example              # every variable, with safe sample values
├── package.json
└── src/
    ├── index.js              # entry: connect DB, start server, graceful shutdown
    ├── app.js                # express app: security middleware, /api/v1 routes, error handlers
    │
    ├── config/               # ALL constants, enums and settings live here
    │   ├── env.js            # loads .env and validates it with Joi (fails fast on bad config)
    │   ├── config.js         # frozen, grouped config object built from env.js
    │   ├── db.js             # mongoose connect + connection event logs
    │   ├── roles.js          # ROLES enum, labels, role groups, helpers
    │   ├── modules.js        # MODULES + ACTIONS (view/add/edit/delete) for permissions
    │   ├── tokens.js         # TOKEN_TYPES
    │   ├── passwordPolicy.js # password rules shared by validation + seed scripts
    │   ├── userStatus.js     # USER_STATUS enum
    │   └── <feature>.js      # per-feature limits / enums / sort fields (e.g. clients.js)
    │
    ├── models/
    │   ├── index.js          # re-exports every model: module.exports.User = require('./user.model')
    │   ├── plugins/
    │   │   ├── index.js
    │   │   └── toJSON.plugin.js  # _id → id, drops __v and fields marked `private: true`
    │   ├── user.model.js
    │   ├── token.model.js
    │   └── <feature>.model.js
    │
    ├── validations/
    │   ├── index.js          # module.exports.<feature>Validation = require('./<feature>.validation')
    │   ├── custom.validation.js  # objectId, strongPassword, ...
    │   └── <feature>.validation.js   # { params, query, body } Joi schemas per endpoint
    │
    ├── services/             # ALL business logic + DB access. Throws ApiError.
    │   ├── index.js          # module.exports.<feature>Service = require('./<feature>.service')
    │   ├── auth.service.js
    │   ├── token.service.js
    │   ├── user.service.js
    │   ├── access.service.js # role → module → action permission checks
    │   ├── health.service.js
    │   └── <feature>.service.js
    │
    ├── controllers/          # thin: read req → call service → send status + JSON
    │   ├── index.js          # module.exports.<feature>Controller = require('./<feature>.controller')
    │   └── <feature>.controller.js
    │
    ├── routes/
    │   └── v1/
    │       ├── index.js      # mounts every route file under its path
    │       └── <feature>.route.js
    │
    ├── middlewares/
    │   ├── auth.js           # auth() / auth(...roles) — verifies Bearer JWT, loads req.user
    │   ├── permission.js     # permit(module, action) — checks the permission matrix
    │   ├── validate.js       # validate(schema) — Joi-validates params/query/body
    │   ├── rateLimiter.js    # loginLimiter, refreshLimiter
    │   └── error.js          # notFound, errorConverter, errorHandler
    │
    ├── utils/
    │   ├── ApiError.js       # Error with statusCode, details, isOperational
    │   ├── httpStatus.js     # frozen map of status codes used in the app
    │   ├── password.js       # hashPassword, verifyPassword, needsRehash (bcrypt)
    │   ├── hash.js           # sha256 (for storing refresh tokens hashed)
    │   └── requestMeta.js    # { ip, userAgent } from req
    │
    └── scripts/              # one-off CLI scripts run via npm scripts
        ├── seedAdmin.js
        └── <seed|migrate>*.js
```

### Naming rules
- Files: `camelCase` + layer suffix → `client.model.js`, `client.service.js`, `client.controller.js`, `client.route.js`, `client.validation.js`, config `clients.js`.
- Exports from each layer's `index.js`: `<feature>Service`, `<feature>Controller`, `<feature>Validation`; models by PascalCase name (`Client`).
- Constants/enums: `UPPER_SNAKE_CASE`, always `Object.freeze(...)`.
- Routes are versioned: everything lives under `/api/v1`.

---

## 3. Request flow (layering rules)

```
route  →  auth()  →  permit(module, action)  →  validate(schema)  →  controller  →  service  →  model
                                                                                      │
                                                     throws ApiError ─────────────────┘
                                                                ↓
                                              errorConverter → errorHandler → JSON { code, message, details? }
```

- **Routes**: only wire middleware + controller. No logic.
- **Controllers**: no business logic, no DB calls. Read `req.params / req.query / req.body / req.user`, call one service function, respond with `res.status(httpStatus.X).json(...)`. Deletes return `204` with `.send()`.
- **Services**: all logic, DB queries, existence checks, conflicts. Throw `new ApiError(status, message, details?)`. Never touch `req`/`res`.
- **Models**: schema, indexes, `toJSON` plugin, small `statics`/`methods` (e.g. `isNameTaken`, `isActive`).
- **Validations**: Joi for `params`, `query`, `body`. `validate()` strips unknown keys and applies defaults, so controllers/services trust the input.
- **Config**: no magic strings or numbers in other layers — import them from `config/`.

### Error response shape (always)
```json
{ "code": 400, "message": "Validation failed", "details": [{ "field": "name", "message": "name is required" }] }
```

### Paged list response shape (always)
```json
{ "results": [], "page": 1, "limit": 20, "totalPages": 1, "totalResults": 0 }
```

---

## 4. Core files (create these exactly)

### `package.json` (scripts part)
```json
{
  "main": "src/index.js",
  "private": true,
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "seed:admin": "node src/scripts/seedAdmin.js"
  }
}
```

### `.env.example`
```env
NODE_ENV=development
PORT=3000

MONGODB_URL=mongodb://127.0.0.1:27017/myapp

CORS_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=replace-with-a-long-random-string-of-at-least-32-characters
JWT_REFRESH_SECRET=replace-with-a-different-long-random-string-of-32-plus-chars
JWT_ACCESS_EXPIRES_MINUTES=15
JWT_REFRESH_EXPIRES_DAYS=7

BCRYPT_SALT_ROUNDS=12

ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Change-me@123
```

### `src/index.js`
```js
const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const connectDB = require('./config/db');

let server;

const start = async () => {
  try {
    await connectDB();
    server = app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port} (${config.env})`);
    });
  } catch (err) {
    console.error('Could not start server:', err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  shutdown('unhandledRejection');
});

start();
```

### `src/app.js`
```js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/config');
const routes = require('./routes/v1');
const { notFound, errorConverter, errorHandler } = require('./middlewares/error');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
```

### `src/config/env.js`
```js
const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env'), quiet: true });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),

  MONGODB_URL: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173').description('Comma separated list of allowed origins'),

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
```

### `src/config/config.js`
```js
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
    issuer: 'myapp',
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresMinutes: env.JWT_ACCESS_EXPIRES_MINUTES,
    refreshExpiresDays: env.JWT_REFRESH_EXPIRES_DAYS,
  },
  bcrypt: { saltRounds: env.BCRYPT_SALT_ROUNDS },
  seedAdmin: { name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
};

module.exports = Object.freeze(config);
```

### `src/config/db.js`
```js
const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  await mongoose.connect(config.mongo.url);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));

module.exports = connectDB;
```

### `src/config/roles.js` (adapt the roles to the project)
```js
const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
});

const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.EMPLOYEE]: 'Employee',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));
const MANAGER_ROLES = Object.freeze([ROLES.ADMIN, ROLES.MANAGER]);
const LOCKED_ROLES = Object.freeze([ROLES.ADMIN]); // always full access, cannot be edited
const ASSIGNABLE_ROLES = Object.freeze(ALL_ROLES.filter((r) => !LOCKED_ROLES.includes(r)));

const roleLabel = (role) => ROLE_LABELS[role] || role;

module.exports = { ROLES, ROLE_LABELS, ALL_ROLES, MANAGER_ROLES, LOCKED_ROLES, ASSIGNABLE_ROLES, roleLabel };
```

### `src/config/modules.js` (permission modules)
```js
const ACTIONS = Object.freeze({ VIEW: 'view', ADD: 'add', EDIT: 'edit', DELETE: 'delete' });
const ALL_ACTIONS = Object.freeze(Object.values(ACTIONS));

const MODULES = Object.freeze({
  USERS: 'users',
  CLIENTS: 'clients',
  ACCESS_CONTROL: 'access-control',
});

// selfService: staff manage their own records ; restricted: closed by default ; adminOnly: Admin only
const MODULE_LIST = Object.freeze([
  { key: MODULES.CLIENTS, label: 'Clients' },
  { key: MODULES.ACCESS_CONTROL, label: 'Access Control', restricted: true },
  { key: MODULES.USERS, label: 'Users', restricted: true, adminOnly: true },
]);

const MODULE_KEYS = Object.freeze(MODULE_LIST.map((m) => m.key));
const findModule = (key) => MODULE_LIST.find((m) => m.key === key);

module.exports = { ACTIONS, ALL_ACTIONS, MODULES, MODULE_LIST, MODULE_KEYS, findModule };
```

### `src/config/tokens.js`, `src/config/userStatus.js`, `src/config/passwordPolicy.js`
```js
// tokens.js
const TOKEN_TYPES = Object.freeze({ ACCESS: 'access', REFRESH: 'refresh' });
module.exports = { TOKEN_TYPES };

// userStatus.js
const USER_STATUS = Object.freeze({ ACTIVE: 'active', DISABLED: 'disabled' });
const ALL_USER_STATUSES = Object.freeze(Object.values(USER_STATUS));
module.exports = { USER_STATUS, ALL_USER_STATUSES };

// passwordPolicy.js
const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  maxLength: 72,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
  message: 'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number and a special character',
});
const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= PASSWORD_POLICY.minLength &&
  Buffer.byteLength(password, 'utf8') <= PASSWORD_POLICY.maxLength &&
  PASSWORD_POLICY.pattern.test(password);
module.exports = { PASSWORD_POLICY, isStrongPassword };
```

### `src/utils/ApiError.js`
```js
class ApiError extends Error {
  constructor(statusCode, message, details = undefined, isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
```

### `src/utils/httpStatus.js`
```js
const httpStatus = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

module.exports = httpStatus;
```

### `src/utils/hash.js`, `src/utils/requestMeta.js`
```js
// hash.js
const crypto = require('crypto');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
module.exports = { sha256 };

// requestMeta.js
const requestMeta = (req) => ({ ip: req.ip, userAgent: (req.get('user-agent') || '').slice(0, 300) });
module.exports = requestMeta;
```

### `src/utils/password.js`
```js
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const BCRYPT_MAX_BYTES = 72;
// Compared against when the user doesn't exist, so login timing doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', config.bcrypt.saltRounds);

const hashPassword = async (password) => {
  if (typeof password !== 'string' || !password.length) throw new TypeError('Password must be a non-empty string');
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) throw new RangeError(`Password must be at most ${BCRYPT_MAX_BYTES} bytes`);
  return bcrypt.hash(password, config.bcrypt.saltRounds);
};

const verifyPassword = async (password, hash) => {
  if (typeof password !== 'string' || !password.length) return false;
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) return false;
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
};

const needsRehash = (hash) => bcrypt.getRounds(hash) !== config.bcrypt.saltRounds;

module.exports = { BCRYPT_MAX_BYTES, hashPassword, verifyPassword, needsRehash };
```

### `src/models/plugins/toJSON.plugin.js` + `index.js`
```js
// toJSON.plugin.js — fields with `private: true` never leave the API.
const toJSON = (schema) => {
  const existingTransform = schema.options.toJSON?.transform;

  schema.set('toJSON', {
    ...schema.options.toJSON,
    transform(doc, ret, options) {
      Object.entries(schema.paths).forEach(([path, schemaType]) => {
        if (schemaType.options?.private) delete ret[path];
      });
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return existingTransform ? existingTransform(doc, ret, options) : ret;
    },
  });
};

module.exports = toJSON;

// plugins/index.js
module.exports.toJSON = require('./toJSON.plugin');
```

### `src/middlewares/error.js`
```js
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
```

### `src/middlewares/validate.js`
```js
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
```

### `src/middlewares/auth.js`
```js
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
```

### `src/middlewares/permission.js`
```js
const { accessService } = require('../services');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// Use after auth(): permit('clients', 'edit') passes only when the user's role has that action on that module.
const permit = (module, action) => async (req, res, next) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'Please sign in to continue');
  if (!(await accessService.can(req.user.role, module, action))) {
    throw new ApiError(httpStatus.FORBIDDEN, "You don't have permission to do this");
  }
  next();
};

module.exports = permit;
```

### `src/middlewares/rateLimiter.js`
```js
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
```

### `src/validations/custom.validation.js`
```js
const { PASSWORD_POLICY, isStrongPassword } = require('../config/passwordPolicy');

const objectId = (value, helpers) =>
  /^[0-9a-fA-F]{24}$/.test(value) ? value : helpers.message('{{#label}} must be a valid id');

const strongPassword = (value, helpers) =>
  isStrongPassword(value) ? value : helpers.message(PASSWORD_POLICY.message);

module.exports = { objectId, strongPassword };
```

### `src/routes/v1/index.js`
```js
const express = require('express');
const healthRoute = require('./health.route');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const clientRoute = require('./client.route');

const router = express.Router();

const routes = [
  { path: '/health', route: healthRoute },
  { path: '/auth', route: authRoute },
  { path: '/users', route: userRoute },
  { path: '/clients', route: clientRoute },
];

routes.forEach(({ path, route }) => router.use(path, route));

module.exports = router;
```

### Health check (`health.route.js` / `health.controller.js` / `health.service.js`)
```js
// services/health.service.js
const mongoose = require('mongoose');
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];
const getStatus = () => {
  const database = DB_STATES[mongoose.connection.readyState] || 'unknown';
  return {
    healthy: database === 'connected',
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
};
module.exports = { getStatus };

// controllers/health.controller.js
const { healthService } = require('../services');
const httpStatus = require('../utils/httpStatus');
const getHealth = (req, res) => {
  const { healthy, ...report } = healthService.getStatus();
  res.status(healthy ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE).json(report);
};
module.exports = { getHealth };

// routes/v1/health.route.js
const express = require('express');
const { healthController } = require('../../controllers');
const router = express.Router();
router.get('/', healthController.getHealth);
module.exports = router;
```

---

## 5. Auth design (implement this way)

- **Access token**: short-lived JWT (`sub`, `role`, `type: 'access'`), signed with `JWT_ACCESS_SECRET`, sent as `Authorization: Bearer <token>`.
- **Refresh token**: JWT (`sub`, `type: 'refresh'`, `fam` = family UUID, unique `jti`) signed with `JWT_REFRESH_SECRET`. Stored in the `Token` collection **as a sha256 hash only** (`tokenHash`, `user`, `family`, `expiresAt`, `revokedAt`, `replacedByHash`, `createdByIp`, `userAgent`), with a TTL index on `expiresAt`.
- **Rotation**: `POST /auth/refresh-tokens` atomically marks the stored token revoked (`findOneAndUpdate` with `revokedAt: null, expiresAt > now`) and issues a new pair in the same family. If an already-used token is presented again → revoke the **whole family** (reuse detection).
- **Logout**: `POST /auth/logout` revokes the family of the given refresh token (always 204). `POST /auth/logout-all` (signed in) revokes all of the user's tokens.
- **Login**: `POST /auth/login` with `loginLimiter`; same error message for wrong email or password; dummy bcrypt compare when the user doesn't exist; rehash the password if salt rounds changed; check `user.isActive()`.
- **Response**: `{ user, tokens: { access: { token, expiresAt }, refresh: { token, expiresAt } } }`.
- **User model**: `password` has `select: false, private: true`; hashed in a `pre('save')` hook when modified; sets `passwordChangedAt`. Methods: `isActive()`, `isPasswordMatch()`. Statics: `isEmailTaken(email, excludeId)`. Unique email index with `partialFilterExpression: { deletedAt: null }` (soft delete).

Routes:
```js
router.post('/login', loginLimiter, validate(authValidation.login), authController.login);
router.post('/refresh-tokens', refreshLimiter, validate(authValidation.refreshTokens), authController.refreshTokens);
router.post('/logout', refreshLimiter, validate(authValidation.logout), authController.logout);
router.post('/logout-all', auth(), authController.logoutAll);
```

## 6. Access control (role × module × action)

- `config/modules.js` lists modules; actions are `view / add / edit / delete`.
- `config/access.js` holds the **default rules** (e.g. locked roles → full access; manager roles → full; others → view only; `restricted` → none; `adminOnly` → Admin only; `selfService` → view/add/delete own).
- `RolePermission` model stores **only overrides** — one row per `(role, module)` (unique index) with `view/add/edit/delete` booleans and `updatedBy`. No row → default applies. Saving a value equal to the default deletes the row.
- `accessService.can(role, module, action)` → resolves override or default. Used by `permit()` middleware.
- Admin (locked role) can never be edited, and a user can't remove their own Access Control access.

---

## 7. Reference module — copy this pattern for every new feature

Example: **Clients** (CRUD + search + pagination + soft delete + unique name).

### `config/clients.js`
```js
const CLIENT_LIMITS = Object.freeze({ name: 150, email: 254, phone: 30, notes: 2000 });
const CLIENT_SORT_FIELDS = Object.freeze(['name', 'createdAt', 'updatedAt']);
module.exports = { CLIENT_LIMITS, CLIENT_SORT_FIELDS };
```

### `models/client.model.js`
```js
const mongoose = require('mongoose');
const { CLIENT_LIMITS } = require('../config/clients');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;
const NAME_COLLATION = { locale: 'en', strength: 2 }; // case-insensitive

const text = (maxlength) => ({ type: String, trim: true, maxlength, default: '' });

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: CLIENT_LIMITS.name },
    email: { ...text(CLIENT_LIMITS.email), lowercase: true },
    phone: text(CLIENT_LIMITS.phone),
    notes: text(CLIENT_LIMITS.notes),
    createdBy: { type: ObjectId, ref: 'User', required: true },
    // Soft delete: hidden, but old references stay readable.
    deletedAt: { type: Date, default: null, private: true },
    deletedBy: { type: ObjectId, ref: 'User', default: null, private: true },
  },
  { timestamps: true }
);

clientSchema.index({ name: 1 }, { unique: true, collation: NAME_COLLATION, partialFilterExpression: { deletedAt: null } });
clientSchema.plugin(toJSON);

clientSchema.statics.NAME_COLLATION = NAME_COLLATION;
clientSchema.statics.isNameTaken = async function isNameTaken(name, excludeId) {
  const filter = { name: name.trim(), deletedAt: null };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await this.exists(filter).collation(NAME_COLLATION));
};

module.exports = mongoose.model('Client', clientSchema);
```

### `validations/client.validation.js`
```js
const Joi = require('joi');
const { CLIENT_LIMITS, CLIENT_SORT_FIELDS } = require('../config/clients');
const { objectId } = require('./custom.validation');

const id = Joi.string().custom(objectId);
const optional = (max) => Joi.string().trim().max(max).allow('');

const name = Joi.string().trim().min(1).max(CLIENT_LIMITS.name);
const fields = {
  email: Joi.string().trim().lowercase().email().max(CLIENT_LIMITS.email).allow(''),
  phone: optional(CLIENT_LIMITS.phone),
  notes: optional(CLIENT_LIMITS.notes),
};
const clientIdParam = Joi.object({ clientId: id.required() });

const createClient = { body: Joi.object({ name: name.required(), ...fields }) };

const getClients = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow(''),
    sortBy: Joi.string().valid(...CLIENT_SORT_FIELDS).default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const getClient = { params: clientIdParam };
const updateClient = { params: clientIdParam, body: Joi.object({ name, ...fields }).min(1) };
const deleteClient = { params: clientIdParam };

module.exports = { createClient, getClients, getClient, updateClient, deleteClient };
```

### `services/client.service.js`
```js
const { Client } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const fieldError = (status, field, message) => new ApiError(status, message, [{ field, message }]);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameTaken = () => fieldError(httpStatus.CONFLICT, 'name', 'A client with this name already exists');

const LIVE = { deletedAt: null };

// Two saves with the same name at once: the unique index stops the second one.
const saveOrNameTaken = async (save) => {
  try {
    return await save();
  } catch (err) {
    if (err.code === 11000) throw nameTaken();
    throw err;
  }
};

const findLiveClient = async (id) => {
  const client = await Client.findOne({ _id: id, ...LIVE });
  if (!client) throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  return client;
};

const createClient = async (body, actor) => {
  if (await Client.isNameTaken(body.name)) throw nameTaken();
  return saveOrNameTaken(() => Client.create({ ...body, createdBy: actor._id }));
};

const queryClients = async ({ search, sortBy = 'name', order = 'asc', page = 1, limit = 20 }) => {
  const filter = { ...LIVE };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }
  const [results, totalResults] = await Promise.all([
    Client.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1, _id: 1 })
      .collation(Client.NAME_COLLATION)
      .skip((page - 1) * limit)
      .limit(limit),
    Client.countDocuments(filter),
  ]);
  return { results, page, limit, totalPages: Math.max(1, Math.ceil(totalResults / limit)), totalResults };
};

const getClient = (id) => findLiveClient(id);

const updateClient = async (id, updates) => {
  const client = await findLiveClient(id);
  if (updates.name && (await Client.isNameTaken(updates.name, client._id))) throw nameTaken();
  Object.assign(client, updates);
  return saveOrNameTaken(() => client.save());
};

// Soft delete.
const deleteClient = async (id, actor) => {
  const client = await findLiveClient(id);
  client.deletedAt = new Date();
  client.deletedBy = actor._id;
  await client.save();
};

module.exports = { createClient, queryClients, getClient, updateClient, deleteClient };
```

### `controllers/client.controller.js`
```js
const { clientService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const createClient = async (req, res) => {
  res.status(httpStatus.CREATED).json(await clientService.createClient(req.body, req.user));
};

const getClients = async (req, res) => {
  res.status(httpStatus.OK).json(await clientService.queryClients(req.query));
};

const getClient = async (req, res) => {
  res.status(httpStatus.OK).json(await clientService.getClient(req.params.clientId));
};

const updateClient = async (req, res) => {
  res.status(httpStatus.OK).json(await clientService.updateClient(req.params.clientId, req.body));
};

const deleteClient = async (req, res) => {
  await clientService.deleteClient(req.params.clientId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { createClient, getClients, getClient, updateClient, deleteClient };
```

### `routes/v1/client.route.js`
```js
const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES } = require('../../config/modules');
const { clientValidation } = require('../../validations');
const { clientController } = require('../../controllers');

const router = express.Router();

// Reads: any signed-in user. Writes: the role's add / edit / delete on Clients.
const can = (action) => [auth(), permit(MODULES.CLIENTS, action)];

router
  .route('/')
  .post(...can('add'), validate(clientValidation.createClient), clientController.createClient)
  .get(auth(), validate(clientValidation.getClients), clientController.getClients);

router
  .route('/:clientId')
  .get(auth(), validate(clientValidation.getClient), clientController.getClient)
  .patch(...can('edit'), validate(clientValidation.updateClient), clientController.updateClient)
  .delete(...can('delete'), validate(clientValidation.deleteClient), clientController.deleteClient);

module.exports = router;
```

---

## 8. Scripts pattern (`src/scripts/*.js`)

Each script: connect → do work → disconnect → exit with 0/1. Export the function too, and run only when called directly.
```js
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const seedSomething = async () => { /* idempotent: skip if it already exists */ };

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await seedSomething();
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedSomething };
```
Add an npm script for every script (`"seed:admin"`, `"migrate:xyz"`, ...).

---

## 9. Conventions checklist

- REST: `POST /` create (201), `GET /` list (paged), `GET /:id`, `PATCH /:id` (partial, `.min(1)`), `DELETE /:id` (204).
- Route params are named `<entity>Id` (`:clientId`, `:userId`) and validated with `objectId`.
- List endpoints accept `search, sortBy, order, page, limit` and return the paged shape.
- Always escape user input before building a `RegExp`.
- Soft delete with `deletedAt` / `deletedBy` (both `private: true`); every query filters `deletedAt: null`; unique indexes use `partialFilterExpression: { deletedAt: null }`.
- Field errors use `details: [{ field, message }]` so the frontend can show them under inputs.
- Sensitive fields (`password`, `tokenHash`, ...) are `private: true` and/or `select: false`.
- Services receive `actor` (`req.user`) when they need to record who did something (`createdBy`, `updatedBy`).
- Limits/enums are shared from `config/<feature>.js` by both the model and the validation.
- No `try/catch` in controllers — Express 5 forwards rejected promises to the error middleware.

## 10. Adding a new module — checklist

1. `config/<feature>s.js` — limits, enums, sort fields.
2. `models/<feature>.model.js` — schema + `toJSON` plugin + indexes → register in `models/index.js`.
3. `validations/<feature>.validation.js` — one schema object per endpoint → register in `validations/index.js`.
4. `services/<feature>.service.js` — logic, throws `ApiError` → register in `services/index.js`.
5. `controllers/<feature>.controller.js` — thin handlers → register in `controllers/index.js`.
6. `routes/v1/<feature>.route.js` — `auth()` / `permit()` / `validate()` / controller → mount in `routes/v1/index.js`.
7. If it needs permissions, add the key to `MODULES` and `MODULE_LIST` in `config/modules.js`.
8. New env vars → `env.js` (Joi schema) + `config.js` + `.env.example`.
