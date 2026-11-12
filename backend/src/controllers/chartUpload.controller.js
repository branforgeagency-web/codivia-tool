const { chartUploadService } = require('../services');
const httpStatus = require('../utils/httpStatus');

const getUploads = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.listUploads(req.query));
};

const createUpload = async (req, res) => {
  res.status(httpStatus.CREATED).json(await chartUploadService.createUpload(req.body, req.user));
};

const setStatus = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.setStatus(req.params.uploadId, req.body.status));
};

const deleteUpload = async (req, res) => {
  await chartUploadService.deleteUpload(req.params.uploadId);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { getUploads, createUpload, setStatus, deleteUpload };
