const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuditLog, User } = require('../src/models');
const { record } = require('../src/services/audit.service');
const { keyDiff } = require('../src/utils/auditDiff');

const admin = { _id: '6650a1b2c3d4e5f6a7b8c9d1', name: 'Dr Admin', role: 'admin' };

const stubCreate = (t, impl) => {
  const orig = AuditLog.create;
  t.after(() => {
    AuditLog.create = orig;
  });
  const rows = [];
  AuditLog.create = impl || (async (doc) => rows.push(doc));
  return rows;
};

test('records who did what, with the category from the action', async (t) => {
  const rows = stubCreate(t);
  await record(admin, 'chart.edit', { target: { type: 'chart', id: 'EM-0001', label: 'EM-0001 — Chest pain' }, summary: 'Answer key: added R07.9' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].actorName, 'Dr Admin');
  assert.equal(rows[0].category, 'charts');
  assert.equal(rows[0].target.label, 'EM-0001 — Chest pain');
});

test('looks up a student label when none is given', async (t) => {
  const rows = stubCreate(t);
  const orig = User.findById;
  t.after(() => {
    User.findById = orig;
  });
  User.findById = () => ({ select: () => ({ lean: async () => ({ name: 'Asha', studentId: 'STU-00012' }) }) });
  await record(admin, 'allocation.remove', { target: { type: 'student', id: '6650a1b2c3d4e5f6a7b8c9d2' } });
  assert.equal(rows[0].target.label, 'Asha (STU-00012)');
  assert.equal(rows[0].category, 'allocations');
});

test('never throws: a failed write or unknown action is only logged', async (t) => {
  stubCreate(t, async () => {
    throw new Error('db down');
  });
  const origErr = console.error;
  t.after(() => {
    console.error = origErr;
  });
  const errors = [];
  console.error = (...a) => errors.push(a.join(' '));
  await record(admin, 'student.create', { target: { type: 'student', id: 'x', label: 'x' } });
  await record(admin, 'no.such.action');
  await record(null, 'student.create');
  assert.equal(errors.length, 3);
});

test('answer key diff lists added and removed codes', () => {
  const d = keyDiff([{ code: 'R07.9' }, { code: 'i10' }], [{ code: 'I10' }, { code: 'R07.89' }]);
  assert.deepEqual(d.added, ['R07.89']);
  assert.deepEqual(d.removed, ['R07.9']);
  assert.equal(d.text, 'added R07.89; removed R07.9');
  assert.equal(keyDiff([{ code: 'I10' }], [{ code: 'I10' }]).text, 'codes unchanged, details edited');
});
