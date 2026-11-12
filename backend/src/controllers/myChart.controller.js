const { myChartService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMyDepartments = async (req, res) => {
  res.status(httpStatus.OK).json(await myChartService.getMyDepartments(req.user));
};

module.exports = { getMyDepartments };
