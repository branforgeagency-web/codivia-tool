const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { auditValidation: v } = require('../../validations');
const { auditController: c } = require('../../controllers');

const router = express.Router();

// Admin role only. Read-only: entries are written by the admin actions themselves.
router.use(auth(ROLES.ADMIN));

// Audit Log page: ?category=&actor=&action=&from=&to=&search=&page=&limit=
router.get('/', validate(v.getLogs), c.getLogs);

module.exports = router;
