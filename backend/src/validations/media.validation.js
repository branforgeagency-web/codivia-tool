const Joi = require('joi');
const { MEDIA_FOLDER_LIST, DEFAULT_MEDIA_FOLDER } = require('../config/media');

// POST /media-upload (multipart): the file itself is checked by media.service.
const uploadMedia = {
  body: Joi.object({
    folder: Joi.string()
      .trim()
      .valid(...MEDIA_FOLDER_LIST)
      .default(DEFAULT_MEDIA_FOLDER),
  }),
};

module.exports = { uploadMedia };
