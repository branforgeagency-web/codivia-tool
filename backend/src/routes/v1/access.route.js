const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { accessValidation } = require('../../validations');
const { accessController } = require('../../controllers');

const router = express.Router();

const can = (action) => [auth(), permit(MODULES.ACCESS_CONTROL, action)];

router.get('/', ...can(ACTIONS.VIEW), accessController.getMatrix);
router.patch('/:role/:module', ...can(ACTIONS.EDIT), validate(accessValidation.updatePermission), accessController.updatePermission);

module.exports = router;
