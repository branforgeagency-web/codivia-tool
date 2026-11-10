const { authService } = require('../services');
const httpStatus = require('../utils/httpStatus');
const requestMeta = require('../utils/requestMeta');

const register = async (req, res) => {
  res.status(httpStatus.CREATED).json(await authService.register(req.body, requestMeta(req)));
};

const login = async (req, res) => {
  const { email, password } = req.body;
  res.status(httpStatus.OK).json(await authService.login(email, password, requestMeta(req)));
};

const refreshTokens = async (req, res) => {
  res.status(httpStatus.OK).json(await authService.refreshAuth(req.body.refreshToken, requestMeta(req)));
};

const logout = async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
};

const logoutAll = async (req, res) => {
  await authService.logoutAll(req.user);
  res.status(httpStatus.NO_CONTENT).send();
};

const getMe = (req, res) => {
  res.status(httpStatus.OK).json(req.user);
};

module.exports = { register, login,refreshTokens, logout, logoutAll, getMe };
