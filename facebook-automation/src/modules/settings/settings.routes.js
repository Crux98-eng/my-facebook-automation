const express = require('express');
const settingsController = require('./settings.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/status', authenticate, settingsController.getStatus);
router.patch('/settings', authenticate, settingsController.updateSettings);
router.post('/run', authenticate, settingsController.runAutomation);

module.exports = router;
