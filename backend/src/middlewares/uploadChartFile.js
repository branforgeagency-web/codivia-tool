const path = require('path');
const multer = require('multer');
const { UPLOAD_LIMITS } = require('../config/chartUploads');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.txt']);
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMITS.fileBytes, files: 1 },
  fileFilter(req, file, callback) {
    if (!allowedExtensions.has(path.extname(file.originalname || '').toLowerCase())) {
      return callback(new ApiError(httpStatus.BAD_REQUEST, 'Unsupported file type. Use PDF, DOC/DOCX or TXT.'));
    }
    return callback(null, true);
  },
}).single('file');

const uploadChartFile = (req, res, next) => {
  parser(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? httpStatus.PAYLOAD_TOO_LARGE : httpStatus.BAD_REQUEST;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds the 10 MB limit.'
          : 'Upload one file using the "file" field.';
      return next(new ApiError(status, message));
    }
    return next(error);
  });
};

module.exports = uploadChartFile;
