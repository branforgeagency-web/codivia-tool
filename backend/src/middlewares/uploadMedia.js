const multer = require('multer');
const { MEDIA_MAX_BYTES } = require('../config/media');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// multipart/form-data with one file in the "file" field (plus text fields such as "folder").
// Kept in memory and sent to S3; the per-folder type and size rules are checked in media.service.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES, files: 1, fields: 5 },
}).single('file');

const uploadMedia = (req, res, next) => {
  parser(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const tooBig = error.code === 'LIMIT_FILE_SIZE';
      return next(
        new ApiError(
          tooBig ? httpStatus.PAYLOAD_TOO_LARGE : httpStatus.BAD_REQUEST,
          tooBig ? `File exceeds the ${Math.round(MEDIA_MAX_BYTES / 1048576)} MB limit.` : 'Upload one file using the "file" field.'
        )
      );
    }
    return next(error);
  });
};

module.exports = uploadMedia;
