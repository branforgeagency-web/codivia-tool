const { chartUploadService } = require('../services');
const httpStatus = require('../utils/httpStatus');
const ApiError = require('../utils/ApiError');

const extractText = async (req, res) => {
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a PDF, DOC/DOCX or TXT file.');
  const result = await chartUploadService.extractFileText(req.file);
  res.status(httpStatus.OK).json(result);
};

const getUploads = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.listUploads(req.query));
};

const createUpload = async (req, res) => {
  res.status(httpStatus.CREATED).json(await chartUploadService.createUpload(req.body, req.user));
};

const getUpload = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.getUpload(req.params.uploadId));
};

const updateUpload = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.updateUpload(req.params.uploadId, req.body));
};

const setStatus = async (req, res) => {
  res.status(httpStatus.OK).json(await chartUploadService.setStatus(req.params.uploadId, req.body.status));
};

const deleteUpload = async (req, res) => {
  await chartUploadService.deleteUpload(req.params.uploadId);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = { extractText, getUploads, createUpload, getUpload, updateUpload, setStatus, deleteUpload };
