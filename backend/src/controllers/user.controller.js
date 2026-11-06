const { userService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const createUser = async (req, res) => {
  res.status(httpStatus.CREATED).json(await userService.createUser(req.body, req.user));
};

const getUsers = async (req, res) => {
  res.status(httpStatus.OK).json(await userService.queryUsers(req.query));
};

const getUser = async (req, res) => {
  res.status(httpStatus.OK).json(await userService.getUser(req.params.userId));
};

const updateUser = async (req, res) => {
  res.status(httpStatus.OK).json(await userService.updateUser(req.params.userId, req.body, req.user));
};

const deleteUser = async (req, res) => {
  await userService.deleteUser(req.params.userId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { createUser, getUsers, getUser, updateUser, deleteUser };
