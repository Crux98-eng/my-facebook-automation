const Joi = require('joi');

const createPostSchema = Joi.object({
  assetId: Joi.string().uuid().required(),
  templateId: Joi.string().uuid().optional(),
  caption: Joi.string().required().trim(),
  cta: Joi.string().allow('', null).optional(),
  hashtags: Joi.array().items(Joi.string()).default([]),
  targetAudience: Joi.array().items(Joi.string()).default([]),
  status: Joi.string().valid('draft', 'scheduled', 'approved').default('draft'),
  scheduledAt: Joi.date().iso().allow(null).optional()
});

const schedulePostSchema = Joi.object({
  scheduledAt: Joi.date().iso().required().min('now')
});

const listPostQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'cancelled').optional(),
  assetId: Joi.string().uuid().optional()
});

module.exports = {
  createPostSchema,
  schedulePostSchema,
  listPostQuerySchema
};
