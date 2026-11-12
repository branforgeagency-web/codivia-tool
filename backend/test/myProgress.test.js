const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Allocation, Chart, ChartResult, Department } = require('../src/models');
const { getMyProgress } = require('../src/services/myProgress.service');

const queryResult = (rows) => ({
  select() {
    return this;
  },
  lean: async () => rows,
});

test('returns only the signed-in student progress and server-filtered status counts', async (t) => {
  const models = { Allocation, Chart, ChartResult, Department };
  const originals = Object.fromEntries(
    Object.entries(models).map(([name, model]) => [name, { find: model.find, aggregate: model.aggregate }])
  );
  t.after(() => {
    Object.entries(models).forEach(([name, model]) => Object.assign(model, originals[name]));
  });

  const studentId = '0123456789abcdef01234567';
  Allocation.find = (query) => {
    assert.deepEqual(query, { student: studentId });
    return queryResult([{ dept: 'CARDIO' }, { dept: 'GI' }, { dept: 'FP' }]);
  };
  Department.find = (query) => {
    assert.deepEqual(query, {
      _id: { $in: ['CARDIO', 'GI', 'FP'] },
      isActive: true,
    });
    return queryResult([
      { _id: 'CARDIO', name: 'Cardiology' },
      { _id: 'GI', name: 'Gastroenterology' },
      { _id: 'FP', name: 'Family Practice' },
    ]);
  };
  Chart.aggregate = async () => [
    { _id: 'CARDIO', count: 250 },
    { _id: 'GI', count: 180 },
    { _id: 'FP', count: 100 },
  ];
  ChartResult.aggregate = async (pipeline) => {
    assert.deepEqual(pipeline[0], { $match: { student: studentId } });
    return [
      {
        departments: [
          { _id: 'CARDIO', worked: 200, avg: 91 },
          { _id: 'GI', worked: 3, avg: 80 },
        ],
        overall: [{ totalWorked: 203, avg: 90.837 }],
      },
    ];
  };

  const result = await getMyProgress({ _id: studentId }, { status: 'not-started' });
  assert.equal(result.status, 'not-started');
  assert.deepEqual(result.results.map((department) => department.key), ['FP']);
  assert.deepEqual(result.filters, [
    { key: 'all', label: 'All', count: 3 },
    { key: 'certified', label: 'Certified', count: 1 },
    { key: 'in-progress', label: 'In progress', count: 1 },
    { key: 'not-started', label: 'Not started', count: 1 },
  ]);
  assert.deepEqual(result.summary, {
    totalWorked: 203,
    overallAvg: 91,
    departments: 3,
    started: 2,
    certified: 1,
  });
});
