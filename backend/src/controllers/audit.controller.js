const { auditService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getLogs = async (req, res) => {
  res.status(httpStatus.OK).json(await auditService.queryLogs(req.query));
};

module.exports = { getLogs };
