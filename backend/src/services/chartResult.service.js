const { ChartResult, Certificate } = require('../models');
const { MANAGER_ROLES } = require('../config/roles');
const { CERT_THRESHOLD } = require('../config/certificates');
const chartWorkService = require('./chartWork.service');

// Students read their own progress; managers may pass ?student= to read anyone's.
const targetStudent = (student, actor) => (student && MANAGER_ROLES.includes(actor.role) ? student : actor._id);

// The score is always worked out on the server from the chart's answer key; the client only sends
// its work (diagnoses, charge lines, procedures, DRG, abstract, denial decision).
const submitChart = (chartId, submission, student) => chartWorkService.submitWork(student, chartId, submission);

// { chartId: savedResult }, the same map the frontend keeps as `results`.
const getResults = async ({ student }, actor) => {
  const rows = await ChartResult.find({ student: targetStudent(student, actor) }).select(ChartResult.RESULT_LIST_FIELDS).lean();
  return { results: Object.fromEntries(rows.map(({ chart, ...saved }) => [chart, saved])) };
};

// Per-department progress, the same numbers the frontend's `stats` holds.
const getStats = async ({ student }, actor) => {
  const id = targetStudent(student, actor);
  const [scores, certificates] = await Promise.all([
    ChartResult.find({ student: id }).select('dept accuracy').lean(),
    Certificate.find({ student: id }).select('dept').lean(),
  ]);
  const average = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0);
  const byDept = {};
  scores.forEach((s) => (byDept[s.dept] ||= []).push(s.accuracy));
  const certifiedDepts = new Set(certificates.map((c) => c.dept));

  const perDept = Object.fromEntries(
    [...new Set([...Object.keys(byDept), ...certifiedDepts])].map((dept) => {
      const list = byDept[dept] || [];
      return [dept, { worked: list.length, avg: average(list), certified: certifiedDepts.has(dept), remaining: Math.max(0, CERT_THRESHOLD - list.length) }];
    })
  );
  return {
    threshold: CERT_THRESHOLD,
    perDept,
    totalWorked: scores.length,
    overallAvg: average(scores.map((s) => s.accuracy)),
    anyCertified: certifiedDepts.size > 0,
  };
};

module.exports = { submitChart, getResults, getStats };
