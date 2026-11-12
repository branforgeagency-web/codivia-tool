const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const { MODULES, ACTIONS } = require('../../config/modules');
const { codingGuidelineController: c } = require('../../controllers');

const router = express.Router();

router.get('/', auth(), permit(MODULES.CODING_GUIDELINES, ACTIONS.VIEW), c.listCodingGuidelines);

module.exports = router;
