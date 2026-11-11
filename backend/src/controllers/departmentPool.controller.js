const { departmentPoolService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getPools = async (req, res) => {
  res.status(httpStatus.OK).json(await departmentPoolService.queryPools(req.query));
};

module.exports = { getPools };
