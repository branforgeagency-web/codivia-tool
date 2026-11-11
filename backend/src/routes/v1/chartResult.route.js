const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { ROLES } = require('../../config/roles');
const { chartResultValidation: v } = require('../../validations');
const { chartResultController: c } = require('../../controllers');

const router = express.Router();

const canView = [auth(), permit(MODULES.CHART_RESULTS, ACTIONS.VIEW)];

router.get('/', ...canView, validate(v.getResults), c.getResults);
router.get('/stats', ...canView, validate(v.getStats), c.getStats);

// Only students code charts. PUT: submitting a chart again replaces its score.
router.put('/:chartId', auth(ROLES.STUDENT), permit(MODULES.CHART_RESULTS, ACTIONS.EDIT), validate(v.submitChart), c.submitChart);

module.exports = router;
