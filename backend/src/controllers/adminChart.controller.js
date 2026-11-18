const { adminChartService, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');
const { keyDiff } = require('../utils/auditDiff');

const getDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await adminChartService.queryDepartments(req.query));
};

const getCharts = async (req, res) => {
  res.status(httpStatus.OK).json(await adminChartService.queryCharts(req.query));
};

const getChart = async (req, res) => {
  res.status(httpStatus.OK).json(await adminChartService.getChart(req.params.chartId));
};

const updateChart = async (req, res) => {
  const before = req.body.answerKey ? await adminChartService.getChart(req.params.chartId) : null;
  const out = await adminChartService.updateChart(req.params.chartId, req.body);
  const fields = Object.keys(req.body);
  const diff = before ? keyDiff(before.answerKey, out.answerKey) : null;
  await audit.record(req.user, 'chart.edit', {
    target: { type: 'chart', id: req.params.chartId, label: `${req.params.chartId}${out.title ? ' — ' + out.title : ''}` },
    summary: diff && diff.text ? `Answer key: ${diff.text}` : `Changed ${fields.join(', ')}`,
    details: { fields, ...(diff ? { added: diff.added, removed: diff.removed } : {}) },
  });
  res.status(httpStatus.OK).json(out);
};

module.exports = { getDepartments, getCharts, getChart, updateChart };
