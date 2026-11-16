const { myChartService, chartWorkService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMyDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await myChartService.getMyDepartments(req.user, req.query));
};

const getMyQueue = async (req, res) => {
  res.status(httpStatus.OK).json(await myChartService.getMyQueue(req.user, req.params.deptKey, req.query));
};

const getMyChart = async (req, res) => {
  res.status(httpStatus.OK).json(await myChartService.getMyChart(req.user, req.params.deptKey, req.params.chartId));
};

// ---- the student's work on one chart ----
const work = (fn) => async (req, res) => {
  res.status(httpStatus.OK).json(await fn(req.user, req.params.deptKey, req.params.chartId, req.body));
};

module.exports = {
  getMyDepartments,
  getMyQueue,
  getMyChart,
  getWork: work((user, dept, chart) => chartWorkService.getWork(user, dept, chart)),
  saveWork: work(chartWorkService.saveDraft),
  deferChart: work(chartWorkService.deferChart),
  transferChart: work(chartWorkService.transferChart),
  sendQuery: work(chartWorkService.sendQuery),
  openSession: work((user, dept, chart) => chartWorkService.openSession(user, dept, chart)),
  addComment: work(chartWorkService.addComment),
};
