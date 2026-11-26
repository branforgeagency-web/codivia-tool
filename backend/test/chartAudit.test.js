const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuditAssignment, Chart, ChartAudit, ChartResult, ChartWork, User } = require('../src/models');
const service = require('../src/services/chartAudit.service');

const q = (value) => ({
  select() {
    return this;
  },
  lean: async () => value,
});

const auditor = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Asha Auditor', role: 'auditor' };
const STUDENT = '0123456789abcdef01234567';
const CHART = 'EM-0001';

// Stubs the models one test needs and restores them afterwards.
const stub = (t, overrides) => {
  const models = { AuditAssignment, Chart, ChartAudit, ChartResult, ChartWork, User };
  const keys = ['find', 'findOne', 'findById', 'exists', 'findOneAndUpdate', 'updateOne', 'distinct'];
  const saved = Object.fromEntries(Object.entries(models).map(([n, m]) => [n, Object.fromEntries(keys.map((k) => [k, m[k]]))]));
  t.after(() => Object.entries(models).forEach(([n, m]) => Object.assign(m, saved[n])));
  Object.entries(overrides).forEach(([name, fns]) => Object.assign(models[name], fns));
};

const writes = () => ({ audit: null, result: null, work: null });

const baseStubs = (w, { assigned = true, at = 1000, accuracy = 70, autoAccuracy, existing = null } = {}) => ({
  Chart: { findById: () => q({ _id: CHART, dept: 'EM' }) },
  AuditAssignment: { exists: async () => (assigned ? { _id: 'x' } : null) },
  ChartResult: {
    findOne: () => q({ accuracy, autoAccuracy, at }),
    updateOne: async (filter, update) => {
      w.result = { filter, update };
    },
  },
  ChartAudit: {
    findOne: () => q(existing),
    findOneAndUpdate: async (filter, update) => {
      w.audit = { filter, update };
      return { ...update.$set };
    },
  },
  ChartWork: {
    updateOne: async (filter, update) => {
      w.work = { filter, update };
    },
  },
});

test('completing an adjusted audit sets the official score and keeps the automatic one', async (t) => {
  const w = writes();
  stub(t, baseStubs(w));
  const out = await service.saveAudit(auditor, STUDENT, CHART, {
    resultAt: 1000,
    verdict: 'adjusted',
    finalAccuracy: 85,
    findings: [{ code: 'I10', type: 'missing', comment: 'HTN documented' }],
    feedback: 'Hypertension was documented and should be coded.',
    complete: true,
  });
  assert.equal(out.finalAccuracy, 85);
  assert.equal(w.audit.update.$set.status, 'completed');
  assert.deepEqual(w.result.filter, { student: STUDENT, chart: CHART, at: 1000 }); // only this submission
  assert.equal(w.result.update.$set.accuracy, 85);
  assert.equal(w.result.update.$set.autoAccuracy, 70);
  assert.equal(w.result.update.$set.audit.findings[0].label, 'Missing code');
  assert.match(w.work.update.$push.activity.$each[0].text, /70% → 85%/);
});

test('agreeing keeps the automatic score, also when re-auditing an already audited result', async (t) => {
  const w = writes();
  // accuracy 90 is a previous audited score; the automatic score is 70.
  stub(t, baseStubs(w, { accuracy: 90, autoAccuracy: 70 }));
  const out = await service.saveAudit(auditor, STUDENT, CHART, { resultAt: 1000, verdict: 'agree', findings: [], feedback: '', complete: true });
  assert.equal(out.finalAccuracy, 70);
  assert.equal(w.result.update.$set.accuracy, 70);
});

test('a draft never touches the student score', async (t) => {
  const w = writes();
  stub(t, baseStubs(w));
  await service.saveAudit(auditor, STUDENT, CHART, { resultAt: 1000, verdict: 'adjusted', finalAccuracy: 50, findings: [], feedback: '', complete: false });
  assert.equal(w.audit.update.$set.status, 'draft');
  assert.equal(w.result, null);
  assert.equal(w.work, null);
});

test('refuses: unassigned student, a newer submission, missing reason, draft over a completed audit', async (t) => {
  await t.test('not assigned', async (tt) => {
    stub(tt, baseStubs(writes(), { assigned: false }));
    await assert.rejects(service.saveAudit(auditor, STUDENT, CHART, { resultAt: 1000, verdict: 'agree', complete: true }), { statusCode: 404 });
  });
  await t.test('student submitted again', async (tt) => {
    stub(tt, baseStubs(writes(), { at: 2000 }));
    await assert.rejects(service.saveAudit(auditor, STUDENT, CHART, { resultAt: 1000, verdict: 'agree', complete: true }), { statusCode: 409 });
  });
  await t.test('adjusted without feedback', async (tt) => {
    stub(tt, baseStubs(writes()));
    await assert.rejects(service.saveAudit(auditor, STUDENT, CHART, { resultAt: 1000, verdict: 'adjusted', finalAccuracy: 60, feedback: '', complete: true }), { statusCode: 400 });
  });
  await t.test('draft after completion', async (tt) => {
    stub(tt, baseStubs(writes(), { existing: { status: 'completed', resultAt: 1000 } }));
    await assert.rejects(service.saveAudit(auditor, STUDENT, CHART, { resultAt: 1000, verdict: 'agree', complete: false }), { statusCode: 409 });
  });
});

test('queue: an audit of an older submission puts the chart back to "pending"', async (t) => {
  stub(t, {
    AuditAssignment: { find: () => q([{ student: STUDENT, dept: 'EM' }]) },
    User: {
      find: (filter) =>
        filter.role
          ? { distinct: async () => [STUDENT] } // live students
          : q([{ _id: STUDENT, name: 'Sam Student', studentId: 'STU-00001', status: 'active' }]),
    },
    ChartResult: {
      find: () =>
        q([
          { student: STUDENT, chart: 'EM-0001', dept: 'EM', accuracy: 60, at: 2000 }, // resubmitted after its audit
          { student: STUDENT, chart: 'EM-0002', dept: 'EM', accuracy: 92, autoAccuracy: 88, at: 1500 },
        ]),
    },
    ChartAudit: {
      find: () =>
        q([
          { student: STUDENT, chart: 'EM-0001', status: 'completed', resultAt: 1000, verdict: 'agree', finalAccuracy: 75 },
          { student: STUDENT, chart: 'EM-0002', status: 'completed', resultAt: 1500, verdict: 'adjusted', finalAccuracy: 92 },
        ]),
    },
  });
  const summary = await service.getSummary(auditor);
  assert.equal(summary.pending, 1);
  assert.equal(summary.completed, 1);
  assert.equal(summary.priority, 1); // EM-0001 scored 60, below 80
  assert.equal(summary.agreementRate, 0);
});
