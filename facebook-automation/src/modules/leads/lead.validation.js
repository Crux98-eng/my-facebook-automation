const Joi = require('joi');

const leadStatuses = ['new', 'contacted', 'qualified', 'converted', 'not_interested', 'spam', 'archived'];

const updateLeadStatusSchema = Joi.object({
  status: Joi.string().valid(...leadStatuses).required()
});

const listLeadQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...leadStatuses).optional(),
  intent: Joi.string().optional(),
  minScore: Joi.number().integer().min(0).max(100).optional()
});

module.exports = {
  leadStatuses,
  updateLeadStatusSchema,
  listLeadQuerySchema
};
