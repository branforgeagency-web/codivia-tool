const express = require('express');
const auth = require('../../middlewares/auth');
const { ROLES } = require('../../config/roles');
const { myChartController: c } = require('../../controllers');

const router = express.Router();

// Student "My Charts": only the signed-in student's own allocated departments. No answer keys.
router.get('/', auth(ROLES.STUDENT), c.getMyDepartments);

module.exports = router;
