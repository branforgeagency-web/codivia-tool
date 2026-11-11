const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { adminDepartmentValidation: v } = require('../../validations');
const { adminDepartmentController: c } = require('../../controllers');

const router = express.Router();

// Admin role only, checked by role (not Access Control), so it can't be opened to other roles.
router.use(auth(ROLES.ADMIN));

// Departments page: cards, statistics, filter tabs (all / specialty / setting) and search.
router.get('/', validate(v.getDepartments), c.getDepartments);

// Manage allocation for one department, by its key (e.g. CARDIO).
router
  .route('/:deptKey/allocations')
  .get(validate(v.getAllocations), c.getAllocations)
  .put(validate(v.saveAllocations), c.saveAllocations); // the form's Save: many students at once

router
  .route('/:deptKey/allocations/:userId')
  .put(validate(v.setAllocation), c.setAllocation)
  .delete(validate(v.removeAllocation), c.removeAllocation);

module.exports = router;
