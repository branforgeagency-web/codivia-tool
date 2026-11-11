const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { codeValidation: v } = require('../../validations');
const { codeController: c } = require('../../controllers');

const router = express.Router();

// Code Search is read-only reference data (loaded by `npm run seed:codes`), so every route only needs view.
router.use(auth(), permit(MODULES.CODES, ACTIONS.VIEW));

// Fixed paths first, so they aren't taken as /:system/:code.
router.get('/meta', c.getMeta);
router.get('/search', validate(v.searchCodes), c.searchCodes);
router.post('/validate', validate(v.validateCodes), c.validateCodes);
router.get('/family/:stem', validate(v.getFamily), c.getFamily);
router.get('/notes/:code', validate(v.getNotes), c.getNotes);
router.get('/index/:index', validate(v.searchIndex), c.searchIndex);
router.get('/index/:index/resolve', validate(v.resolveIndexRef), c.resolveIndexRef);
router.get('/tables/:table', validate(v.searchTable), c.searchTable);
router.get('/:system/:code', validate(v.getCode), c.getCode);

module.exports = router;
