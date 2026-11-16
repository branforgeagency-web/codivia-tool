const express = require('express');
const auth = require('../../middlewares/auth');
const { referenceService } = require('../../services');
const httpStatus = require('../../utils/httpStatus');

const router = express.Router();

// Reference lists for the coding workspace (students) and the admin upload (admins).
// Any signed-in user; read-only.
router.get('/work-queue', auth(), async (req, res) => {
  res.status(httpStatus.OK).json(await referenceService.getWorkQueueReference());
});

module.exports = router;
