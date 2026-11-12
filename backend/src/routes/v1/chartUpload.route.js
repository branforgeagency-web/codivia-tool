const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { chartUploadValidation: v } = require('../../validations');
const { chartUploadController: c } = require('../../controllers');
const uploadChartFile = require('../../middlewares/uploadChartFile');

const router = express.Router();

// Admin role only: uploads carry their answer keys.
router.use(auth(ROLES.ADMIN));

router.post('/extract', uploadChartFile, c.extractText);

router
  .route('/')
  .get(validate(v.getUploads), c.getUploads) // newest first, paged (10), ?status=draft|published
  .post(validate(v.createUpload), c.createUpload); // status 'published' also adds it to the chart pool

router.patch('/:uploadId/status', validate(v.setStatus), c.setStatus); // publish / back to draft
router.delete('/:uploadId', validate(v.deleteUpload), c.deleteUpload);

module.exports = router;
