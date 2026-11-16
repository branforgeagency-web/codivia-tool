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

// One department's chart queue (10 per page, search, To do / Deferred / Completed, work type chips).
router.get('/:deptKey/charts', validate(v.getMyQueue), c.getMyQueue);

// One chart to work: documents, encounter, original charges / denial, the student's saved work.
router.get('/:deptKey/charts/:chartId', validate(v.getMyChart), c.getMyChart);

// The student's work on that chart (submitting is PUT /chart-results/:chartId).
router.get('/:deptKey/charts/:chartId/work', validate(v.getWork), c.getWork); // poll for query answers
router.put('/:deptKey/charts/:chartId/work', validate(v.saveWork), c.saveWork); // autosave
router.post('/:deptKey/charts/:chartId/defer', validate(v.deferChart), c.deferChart);
router.post('/:deptKey/charts/:chartId/transfer', validate(v.transferChart), c.transferChart);
router.post('/:deptKey/charts/:chartId/queries', validate(v.sendQuery), c.sendQuery);
router.post('/:deptKey/charts/:chartId/session', validate(v.openSession), c.openSession); // denial: accept correction
router.post('/:deptKey/charts/:chartId/comments', validate(v.addComment), c.addComment);

module.exports = router;
