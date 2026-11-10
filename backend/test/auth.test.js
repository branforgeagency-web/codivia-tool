const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.MONGODB_URL = 'mongodb://localhost/auth-test';
process.env.JWT_ACCESS_SECRET = 'access-test-secret-'.repeat(3);
process.env.JWT_REFRESH_SECRET = 'refresh-test-secret-'.repeat(3);
const jwt = require('jsonwebtoken');
const config = require('../src/config/config');
const { Token } = require('../src/models');
const service = require('../src/services/token.service');
const { sha256 } = require('../src/utils/hash');
const user = { id: '0123456789abcdef01234567', _id: '0123456789abcdef01234567', role: 'student' };

test('token issuance, validation, atomic consumption and replay protection', async (t) => {
  const originals = Object.fromEntries(['create', 'findOneAndUpdate', 'findOne', 'updateMany', 'updateOne'].map(k => [k, Token[k]]));
  t.after(() => Object.assign(Token, originals));
  let record;
  Token.create = async value => { record = value; };
  const tokens = await service.generateAuthTokens(user);
  assert.equal(record.tokenHash, sha256(tokens.refresh.token));
  assert.equal(record.token, undefined);
  const payload = service.verifyRefreshToken(tokens.refresh.token);
  assert.equal(payload.sub, user.id);
  assert.ok(payload.jti);
  assert.equal(payload.fam, record.family);
  assert.ok(tokens.refresh.expiresAt > tokens.access.expiresAt);
  assert.equal(service.verifyAccessToken(tokens.refresh.token), null);
  assert.equal(service.verifyRefreshToken(tokens.access.token), null);
  for (const overrides of [{ iss: 'wrong' }, { exp: 1 }, { type: 'access' }, { jti: undefined }]) {
    const bad = jwt.sign({ ...payload, ...overrides }, config.jwt.refreshSecret);
    assert.equal(service.verifyRefreshToken(bad), null);
  }
  Token.findOneAndUpdate = async (query, update) => {
    assert.equal(query.consumedAt, null);
    assert.equal(query.revokedAt, null);
    assert.equal(query.user, user.id);
    assert.ok(update.consumedAt instanceof Date);
    return { ...record, _id: 'record' };
  };
  const stored = await service.consumeRefreshToken(tokens.refresh.token);
  let revoked;
  Token.findOneAndUpdate = async () => null;
  Token.findOne = async () => stored;
  Token.updateMany = async query => { revoked = query; };
  await assert.rejects(service.consumeRefreshToken(tokens.refresh.token), { statusCode: 401 });
  assert.equal(revoked.family, record.family);
  revoked = null;
  Token.updateOne = async () => ({ matchedCount: 0 });
  await assert.rejects(service.markReplaced(stored, 'replacement'), { statusCode: 401 });
  assert.equal(revoked.family, record.family);
  await service.revokeByToken(tokens.refresh.token);
  assert.equal(revoked.family, record.family);
  await service.revokeUserTokens(user.id);
  assert.equal(revoked.user, user.id);
});

test('refresh request validation rejects missing, empty and non-string tokens', () => {
  const validate = require('../src/middlewares/validate');
  const schema = require('../src/validations/auth.validation').refreshTokens;
  for (const body of [{}, { refreshToken: '' }, { refreshToken: 123 }, { refreshToken: 'a'.repeat(2049) }]) {
    let error;
    validate(schema)({ body }, {}, value => { error = value; });
    assert.equal(error.statusCode, 400);
  }
});
