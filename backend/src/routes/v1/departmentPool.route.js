const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { departmentPoolValidation } = require('../../validations');
const { departmentPoolController } = require('../../controllers');

const router = express.Router();

// Admin Overview > Department Chart Pools. Admin role only: checked by role, not by Access Control,
// so it can't be opened to other roles from the permissions screen.
router.get('/', auth(ROLES.ADMIN), validate(departmentPoolValidation.getPools), departmentPoolController.getPools);

module.exports = router;
