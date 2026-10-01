const express = require('express');
const facebookWebhookController = require('./facebook.webhook.controller');
const { webhookLimiter } = require('../../middleware/rate-limit');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/webhook', webhookLimiter, (req, res) => facebookWebhookController.verifyWebhook(req, res));
router.post('/webhook', webhookLimiter, (req, res, next) => facebookWebhookController.handleWebhookEvent(req, res, next));
router.get('/status', authenticate, (req, res) => facebookWebhookController.getStatus(req, res));
router.get('/capabilities', authenticate, (req, res, next) => facebookWebhookController.getCapabilities(req, res, next));
router.post('/test', authenticate, (req, res, next) => facebookWebhookController.testConnection(req, res, next));

module.exports = router;
