const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { departmentValidation } = require('../../validations');
const { departmentController } = require('../../controllers');

const router = express.Router();

const can = (action) => [auth(), permit(MODULES.DEPARTMENTS, action)];

// Public: active departments with charts (sign-in / sign-up page). Declared before /:key.
router.get('/public', departmentController.getPublicDepartments);

// Groups and code sets for building department forms. Declared before /:key.
router.get('/meta', ...can(ACTIONS.VIEW), departmentController.getMeta);

router
  .route('/')
  .get(...can(ACTIONS.VIEW), validate(departmentValidation.getDepartments), departmentController.getDepartments)
  .post(...can(ACTIONS.ADD), validate(departmentValidation.createDepartment), departmentController.createDepartment);

router
  .route('/:key')
  .get(...can(ACTIONS.VIEW), validate(departmentValidation.getDepartment), departmentController.getDepartment)
  .patch(...can(ACTIONS.EDIT), validate(departmentValidation.updateDepartment), departmentController.updateDepartment)
  .delete(...can(ACTIONS.DELETE), validate(departmentValidation.deleteDepartment), departmentController.deleteDepartment);

module.exports = router;
