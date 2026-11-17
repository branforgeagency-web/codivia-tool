const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { adminQueryValidation: v } = require('../../validations');
const { adminQueryController: c } = require('../../controllers');

const router = express.Router();

// Admin role only: students' physician (CDI) queries and the admin's answers.
router.use(auth(ROLES.ADMIN));

// Physician Queries page: ?status=pending|answered|all&search=&page=&limit=
router.get('/', validate(v.getQueries), c.getQueries);

// Sidebar badge: { pending }
router.get('/pending-count', c.getPendingCount);

// Answer one query: { answer }. Takes the chart off hold for the student.
router.post('/:workId/:queryId/answer', validate(v.answerQuery), c.answerQuery);

module.exports = router;
