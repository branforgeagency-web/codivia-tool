const { mediaService } = require('../services');
const httpStatus = require('../utils/httpStatus');
const ApiError = require('../utils/ApiError');

const uploadMedia = async (req, res) => {
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a file to upload (form field "file").');
  const media = await mediaService.uploadFile(req.file, req.body.folder);
  res.status(httpStatus.CREATED).json(media);
};

module.exports = { uploadMedia };
