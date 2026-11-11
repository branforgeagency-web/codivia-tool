const { resumeService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const createResume = async (req, res) => {
  res.status(httpStatus.CREATED).json(await resumeService.createResume(req.body, req.user));
};

const getResumes = async (req, res) => {
  res.status(httpStatus.OK).json(await resumeService.queryResumes(req.query, req.user));
};

const getResume = async (req, res) => {
  res.status(httpStatus.OK).json(await resumeService.getResume(req.params.resumeId, req.user));
};

const replaceResume = async (req, res) => {
  res.status(httpStatus.OK).json(await resumeService.replaceResume(req.params.resumeId, req.body, req.user));
};

const updateResume = async (req, res) => {
  res.status(httpStatus.OK).json(await resumeService.updateResume(req.params.resumeId, req.body, req.user));
};

const deleteResume = async (req, res) => {
  await resumeService.deleteResume(req.params.resumeId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { createResume, getResumes, getResume, replaceResume, updateResume, deleteResume };
