const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { MODULES, ACTIONS } = require('../../config/modules');
const { resumeValidation: v } = require('../../validations');
const { resumeController: c } = require('../../controllers');

const router = express.Router();

// Everyone manages their own resumes (the service checks ownership); Admin sees all.
const can = (action) => [auth(), permit(MODULES.RESUMES, action)];

router
  .route('/')
  .post(...can(ACTIONS.ADD), validate(v.createResume), c.createResume)
  .get(...can(ACTIONS.VIEW), validate(v.getResumes), c.getResumes);

router
  .route('/:resumeId')
  .get(...can(ACTIONS.VIEW), validate(v.getResume), c.getResume)
  .put(...can(ACTIONS.EDIT), validate(v.replaceResume), c.replaceResume)
  .patch(...can(ACTIONS.EDIT), validate(v.updateResume), c.updateResume)
  .delete(...can(ACTIONS.DELETE), validate(v.deleteResume), c.deleteResume);

module.exports = router;
