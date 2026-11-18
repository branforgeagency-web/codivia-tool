const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { adminWorkValidation: v } = require('../../validations');
const { adminWorkController: c } = require('../../controllers');

const router = express.Router();

// Admin role only: what students do inside charts (deferred, transferred, in progress, done).
router.use(auth(ROLES.ADMIN));

// Chart Activity page: ?status=attention|deferred|transferred|in_progress|done|all&dept=&queue=&search=&page=&limit=
router.get('/', validate(v.getWork), c.getWork);

// Sidebar badge: { deferred, transferred, attention }
router.get('/summary', c.getSummary);

// Send a deferred / transferred chart back to the student: { note? }
router.post('/:workId/return', validate(v.returnToStudent), c.returnToStudent);

// Close a transferred chart: { verdict: 'correct'|'incorrect', note? }
router.post('/:workId/resolve', validate(v.resolveTransfer), c.resolveTransfer);

// A note the student sees in the chart's Activity panel: { text }
router.post('/:workId/notes', validate(v.addNote), c.addNote);

module.exports = router;
