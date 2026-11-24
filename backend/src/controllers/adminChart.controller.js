const { adminChartService, auditService: audit } = require('../services');
const httpStatus = require('../utils/httpStatus');
const { keyDiff } = require('../utils/auditDiff');

// A confirmed encounter / billing type change on a live chart, with the student work it touched.
const recordEncounterChange = (user, chartId, out) => {
  const c = out.encounterChange;
  return audit.record(user, 'chart.encounterType', {
    target: { type: 'chart', id: chartId, label: `${chartId}${out.title ? ' — ' + out.title : ''}` },
    summary: `Encounter type ${c.from} → ${c.to}` + (c.submitted || c.inProgress ? ` (confirmed: ${c.submitted} submitted, ${c.inProgress} in progress)` : ''),
    details: c,
  });
};

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
  const out = await adminChartService.updateChart(req.params.chartId, req.body, req.user);
  if (out.encounterChange) await recordEncounterChange(req.user, req.params.chartId, out);
  const fields = Object.keys(req.body).filter((f) => f !== 'confirmEncounterChange');
  const diff = before ? keyDiff(before.answerKey, out.answerKey) : null;
  await audit.record(req.user, 'chart.edit', {
    target: { type: 'chart', id: req.params.chartId, label: `${req.params.chartId}${out.title ? ' — ' + out.title : ''}` },
    summary: diff && diff.text ? `Answer key: ${diff.text}` : `Changed ${fields.join(', ')}`,
    details: { fields, ...(diff ? { added: diff.added, removed: diff.removed } : {}) },
  });
  res.status(httpStatus.OK).json(out);
};

module.exports = { getDepartments, getCharts, getChart, updateChart, recordEncounterChange };
