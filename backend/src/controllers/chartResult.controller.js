const { chartResultService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const submitChart = async (req, res) => {
  res.status(httpStatus.OK).json(await chartResultService.submitChart(req.params.chartId, req.body, req.user));
};

const getResults = async (req, res) => {
  res.status(httpStatus.OK).json(await chartResultService.getResults(req.query, req.user));
};

const getStats = async (req, res) => {
  res.status(httpStatus.OK).json(await chartResultService.getStats(req.query, req.user));
};

module.exports = { submitChart, getResults, getStats };
