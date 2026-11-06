const { accessService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getMatrix = async (req, res) => {
  res.status(httpStatus.OK).json(await accessService.getMatrix());
};

const updatePermission = async (req, res) => {
  const { role, module } = req.params;
  res.status(httpStatus.OK).json(await accessService.updatePermission(role, module, req.body, req.user));
};

module.exports = { getMatrix, updatePermission };
