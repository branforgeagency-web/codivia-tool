const express = require('express');
const auth = require('../../middlewares/auth');
const permit = require('../../middlewares/permission');
const validate = require('../../middlewares/validate');
const { verifyLimiter } = require('../../middlewares/rateLimiter');
const { MODULES, ACTIONS } = require('../../config/modules');
const { certificateValidation: v } = require('../../validations');
const { certificateController: c } = require('../../controllers');

const router = express.Router();

const canView = [auth(), permit(MODULES.CERTIFICATES, ACTIONS.VIEW)];

// Public, so an employer can check a certificate without an account. Declared before /:certificateId.
router.get('/verify/:certificateNo', verifyLimiter, validate(v.verifyCertificate), c.verifyCertificate);

// Certificates are only ever created automatically, when a chart submission earns one.
router.get('/', ...canView, validate(v.getCertificates), c.getCertificates);
router.get('/:certificateId', ...canView, validate(v.getCertificate), c.getCertificate);

module.exports = router;
