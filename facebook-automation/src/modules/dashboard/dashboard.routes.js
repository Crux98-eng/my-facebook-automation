const express = require('express');
const dashboardController = require('./dashboard.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/summary', authenticate, dashboardController.getSummary);
router.get('/', authenticate, dashboardController.getSummary);

module.exports = router;
