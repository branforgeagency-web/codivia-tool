const { myChartService } = require('../services');
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

module.exports = { getMyDepartments, getMyQueue, getMyChart };
