const express = require('express');
const { healthController } = require('../../controllers');

const router = express.Router();

router.get('/', healthController.getHealth);

module.exports = router;
