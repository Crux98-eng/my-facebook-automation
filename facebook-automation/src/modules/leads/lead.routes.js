const express = require('express');
const leadController = require('./lead.controller');
const validate = require('../../middleware/validation');
const { updateLeadStatusSchema, listLeadQuerySchema } = require('./lead.validation');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/', authenticate, validate(listLeadQuerySchema, 'query'), leadController.list);
router.get('/:id', authenticate, leadController.getById);
router.patch('/:id', authenticate, validate(updateLeadStatusSchema, 'body'), leadController.updateStatus);

module.exports = router;
