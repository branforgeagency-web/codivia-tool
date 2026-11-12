const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ROLES } = require('../../config/roles');
const { myProgressValidation } = require('../../validations');
const { myProgressController } = require('../../controllers');

const router = express.Router();

router.get('/', auth(ROLES.STUDENT), validate(myProgressValidation.getMyProgress), myProgressController.getMyProgress);

module.exports = router;
