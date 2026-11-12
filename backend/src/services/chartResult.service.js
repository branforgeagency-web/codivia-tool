const { Allocation, Chart, ChartResult, Certificate } = require('../models');
const { MANAGER_ROLES } = require('../config/roles');
const { CERT_THRESHOLD } = require('../config/certificates');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');
const { gradeChart, toSavedResult } = require('../utils/gradeChart');
const certificateService = require('./certificate.service');

const DUPLICATE_KEY = 11000;

// Students read their own progress; managers may pass ?student= to read anyone's.
const targetStudent = (student, actor) => (student && MANAGER_ROLES.includes(actor.role) ? student : actor._id);

const saveResult = async (filter, doc) => {
  const write = () => ChartResult.findOneAndReplace(filter, doc, { upsert: true });
  try {
    await write();
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
    await write(); // double submit: the other request created the row first, so this replaces it
  }
};

// The score is always worked out here from the chart's answer key; the client only sends its codes.
const submitChart = async (chartId, { rows, drg = '' }, student) => {
  const chart = await Chart.findById(chartId).select('dept deptName position answerKey').lean();
  if (!chart) throw new ApiError(httpStatus.NOT_FOUND, 'Chart not found');
  // Only charts inside the student's allocated range can be submitted.
  const allocation = await Allocation.findOne({ student: student._id, dept: chart.dept }).select('start end').lean();
  if (!allocation || chart.position < allocation.start || chart.position > allocation.end) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This chart is not in your allocation');
  }

  const result = gradeChart(chart.answerKey, rows, drg);
  const saved = toSavedResult(result, chart.dept, Date.now());
  await saveResult({ student: student._id, chart: chart._id }, { student: student._id, chart: chart._id, ...saved });

  const certificate = await certificateService.issueIfEarned(student, chart.dept, chart.deptName);
  return { result, saved, certificate };
};

// { chartId: savedResult }, the same map the frontend keeps as `results`.
const getResults = async ({ student }, actor) => {
  const rows = await ChartResult.find({ student: targetStudent(student, actor) }).select('-_id -student').lean();
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
