const { healthService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getHealth = (req, res) => {
  const { healthy, ...report } = healthService.getStatus();
  res.status(healthy ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE).json(report);
};

module.exports = { getHealth };
