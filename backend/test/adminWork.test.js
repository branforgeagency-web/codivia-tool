const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChartWork } = require('../src/models');
const { resolveTransfer } = require('../src/services/adminWork.service');

const WORK_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const admin = { _id: '6650a1b2c3d4e5f6a7b8c9d1', name: 'Dr Admin' };
const transferAt = new Date('2026-11-17T10:00:00Z');

// Stub ChartWork.findById(...).select(...).lean() and updateOne for one test.
const stub = (t, work, modifiedCount = 1) => {
  const orig = { findById: ChartWork.findById, updateOne: ChartWork.updateOne };
  t.after(() => Object.assign(ChartWork, orig));
  const calls = [];
  ChartWork.findById = () => ({ select: () => ({ lean: async () => work }) });
  ChartWork.updateOne = async (filter, update) => {
    calls.push({ filter, update });
    return { modifiedCount };
  };
  return calls;
};

test('resolves an open transfer and logs it for the student', async (t) => {
  const calls = stub(t, { status: 'transferred', transfer: { queue: 'CDI', at: transferAt } });
  const out = await resolveTransfer(WORK_ID, { verdict: 'correct', note: 'Good catch' }, admin);
  assert.equal(out.status, 'transferred');
  assert.equal(out.resolution.verdict, 'correct');
  const { filter, update } = calls[0];
  assert.equal(filter['transfer.resolution.at'], null);
  assert.equal(filter['transfer.at'], transferAt);
  assert.equal(update.$set['transfer.resolution'].verdict, 'correct');
  assert.match(update.$push.activity.$each[0].text, /Transfer to CDI resolved by Dr Admin — right queue: Good catch/);
  assert.equal(update.$push.activity.$each[0].kind, 'admin');
});

test('refuses charts that are not transferred or already resolved', async (t) => {
  stub(t, { status: 'deferred', defer: { reason: 'x' } });
  await assert.rejects(resolveTransfer(WORK_ID, { verdict: 'correct' }, admin), /Only transferred charts/);
  stub(t, { status: 'transferred', transfer: { queue: 'CDI', at: transferAt, resolution: { verdict: 'incorrect', at: new Date() } } });
  await assert.rejects(resolveTransfer(WORK_ID, { verdict: 'correct' }, admin), /already resolved/);
});

test('reports a conflict when the chart changed in the meantime', async (t) => {
  stub(t, { status: 'transferred', transfer: { queue: 'CDI', at: transferAt } }, 0);
  await assert.rejects(resolveTransfer(WORK_ID, { verdict: 'incorrect' }, admin), /changed in the meantime/);
});
