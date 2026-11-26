const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { chartAuditValidation: v } = require('../../validations');
const { chartAuditController: c } = require('../../controllers');

const router = express.Router();

// Auditor role only, and only the students / departments an admin assigned to the signed-in auditor.
router.use(auth(ROLES.AUDITOR));

router.get('/meta', c.getMeta); // labels, options, thresholds and limits for the auditor pages
router.get('/summary', c.getSummary); // dashboard tiles
router.get('/students', validate(v.getStudents), c.getStudents); // My Students
router.get('/queue', validate(v.getQueue), c.getQueue); // submitted charts to audit / audited

// One submitted chart: GET the chart + submission + audit; PUT saves a draft or completes the audit.
router
  .route('/:studentId/:chartId')
  .get(validate(v.getAudit), c.getAudit)
  .put(validate(v.saveAudit), c.saveAudit);

module.exports = router;
