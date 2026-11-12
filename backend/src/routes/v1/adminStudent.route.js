const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { adminStudentValidation: v } = require('../../validations');
const { adminStudentController: c } = require('../../controllers');

const router = express.Router();

// Admin role only (checked by role, not Access Control): student scores and allocations.
router.use(auth(ROLES.ADMIN));

// Students page: cards with progress, status tabs, statistics. Paged (10 by default), searchable.
router.get('/', validate(v.getStudents), c.getStudents);

// Bulk allocate starter charts: preview, then apply. Declared before /:userId.
router.route('/bulk-allocate').get(c.previewBulk).post(c.applyBulk);

// Performance panel: one student with every saved score.
router.get('/:userId', validate(v.getStudent), c.getStudent);

// Manage Access: the form's departments (with other students' ranges), and save the whole map.
router
  .route('/:userId/allocations')
  .get(validate(v.getAllocations), c.getAllocations)
  .put(validate(v.setAllocations), c.setAllocations);

module.exports = router;
