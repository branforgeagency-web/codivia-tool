const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { feeValidation: v } = require('../../validations');
const { feeController: c } = require('../../controllers');

const router = express.Router();

// Medicare fee schedule reference data (loaded by `npm run seed:fees`): read-only, same access as Code Search.
router.use(auth(), permit(MODULES.CODES, ACTIONS.VIEW));

router.get('/releases', c.listReleases);
router.get('/rvu', validate(v.getRvus), c.getRvus); // ?codes=99214,20610

module.exports = router;
