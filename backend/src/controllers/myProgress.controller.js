const { myProgressService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMyProgress = async (req, res) => {
  res.status(httpStatus.OK).json(await myProgressService.getMyProgress(req.user, req.query));
};

module.exports = { getMyProgress };
