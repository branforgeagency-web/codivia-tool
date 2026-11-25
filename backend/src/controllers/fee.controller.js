const { feeService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getRvus = async (req, res) => {
  res.status(httpStatus.OK).json(await feeService.getRvus(req.query.codes));
};

const listReleases = async (req, res) => {
  res.status(httpStatus.OK).json(await feeService.listReleases());
};

module.exports = { getRvus, listReleases };
