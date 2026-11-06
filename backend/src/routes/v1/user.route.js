const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { userValidation } = require('../../validations');
const { userController } = require('../../controllers');

const router = express.Router();

const can = (action) => [auth(), permit(MODULES.USERS, action)];

router
  .route('/')
  .post(...can(ACTIONS.ADD), validate(userValidation.createUser), userController.createUser)
  .get(...can(ACTIONS.VIEW), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/:userId')
  .get(...can(ACTIONS.VIEW), validate(userValidation.getUser), userController.getUser)
  .patch(...can(ACTIONS.EDIT), validate(userValidation.updateUser), userController.updateUser)
  .delete(...can(ACTIONS.DELETE), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
