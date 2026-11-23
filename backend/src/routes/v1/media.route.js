const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const uploadMedia = require('../../middlewares/uploadMedia');
const { ROLES } = require('../../config/roles');
const { mediaValidation: v } = require('../../validations');
const { mediaController: c } = require('../../controllers');

const router = express.Router();

// Admin role only. multipart/form-data: file=<the file>, folder=charts (default).
// Returns { key, url, name, size, mimeType, folder }.
router.post('/', auth(ROLES.ADMIN), uploadMedia, validate(v.uploadMedia), c.uploadMedia);

module.exports = router;
