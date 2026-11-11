const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { adminChartValidation: v } = require('../../validations');
const { adminChartController: c } = require('../../controllers');

const router = express.Router();

// Admin role only: charts include their answer keys, so students must never reach these routes.
router.use(auth(ROLES.ADMIN));

// Browse Charts screen 1: department cards, statistics, group tabs, search. Declared before /:chartId.
router.get('/departments', validate(v.getDepartments), c.getDepartments);

// Screen 2: a department's charts with status tabs (all / beginner / moderate / advanced / handwritten) and search.
router.get('/', validate(v.getCharts), c.getCharts);

// One chart with its full record, for the View popup.
router.get('/:chartId', validate(v.getChart), c.getChart);

module.exports = router;
