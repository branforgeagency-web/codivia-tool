const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { myChartValidation: v } = require('../../validations');
const { myChartController: c } = require('../../controllers');

const router = express.Router();

// Student "My Charts": only the signed-in student's own allocation. Never returns answer keys.
router.use(auth(ROLES.STUDENT));

// Department cards + stat tiles (10 per page, search, status tabs).
router.get('/', validate(v.getMyDepartments), c.getMyDepartments);

// One department's chart queue (10 per page, search, all / pending / worked).
router.get('/:deptKey/charts', validate(v.getMyQueue), c.getMyQueue);

// One chart to code: record + patient, no answer key.
router.get('/:deptKey/charts/:chartId', validate(v.getMyChart), c.getMyChart);

module.exports = router;
