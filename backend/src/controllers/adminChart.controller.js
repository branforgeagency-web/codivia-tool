const { adminChartService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await adminChartService.queryDepartments(req.query));
};

const getCharts = async (req, res) => {
  res.status(httpStatus.OK).json(await adminChartService.queryCharts(req.query));
};

const getChart = async (req, res) => {
  res.status(httpStatus.OK).json(await adminChartService.getChart(req.params.chartId));
};

module.exports = { getDepartments, getCharts, getChart };
