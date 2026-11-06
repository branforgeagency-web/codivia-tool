const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { loginLimiter, refreshLimiter } = require('../../middlewares/rateLimiter');
const { authValidation } = require('../../validations');
const { authController } = require('../../controllers');

const router = express.Router();

router.post('/login', loginLimiter, validate(authValidation.login), authController.login);
router.post('/refresh-tokens', refreshLimiter, validate(authValidation.refreshTokens), authController.refreshTokens);
router.post('/logout', refreshLimiter, validate(authValidation.logout), authController.logout);
router.post('/logout-all', auth(), authController.logoutAll);
router.get('/me', auth(), authController.getMe);

module.exports = router;
