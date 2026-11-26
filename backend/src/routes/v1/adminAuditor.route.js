const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { adminAuditorValidation: v } = require('../../validations');
const { adminAuditorController: c } = require('../../controllers');

const router = express.Router();

// Admin only: auditor accounts and which students each auditor reviews (per department).
router.use(auth(ROLES.ADMIN));

router
  .route('/')
  .get(validate(v.getAuditors), c.getAuditors)
  .post(validate(v.createAuditor), c.createAuditor);

router
  .route('/:userId')
  .patch(validate(v.updateAuditor), c.updateAuditor) // name / email / password
  .delete(validate(v.deleteAuditor), c.deleteAuditor); // soft delete, releases their students

router.patch('/:userId/status', validate(v.setStatus), c.setStatus);

// Assign students: GET ?dept= for that department's students, PUT replaces this auditor's list there.
router
  .route('/:userId/assignments')
  .get(validate(v.getAssignments), c.getAssignments)
  .put(validate(v.setAssignments), c.setAssignments);

module.exports = router;
