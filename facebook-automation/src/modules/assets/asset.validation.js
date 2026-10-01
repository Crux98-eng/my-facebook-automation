const Joi = require('joi');

const categories = [
  'logo_design',
  'branding',
  'flyer',
  'poster',
  'social_media_design',
  'jersey',
  'mockup',
  'packaging',
  'website',
  'business_card',
  'other'
];

const registerAssetSchema = Joi.object({
  storageKey: Joi.string().required().trim().description('Cloudflare R2 object storage key'),
  category: Joi.string().valid(...categories).default('other'),
  title: Joi.string().required().trim(),
  description: Joi.string().allow('', null).optional(),
  fileName: Joi.string().optional(),
  mimeType: Joi.string().optional(),
  fileSize: Joi.number().optional(),
  tags: Joi.array().items(Joi.string()).default([]),
  services: Joi.array().items(Joi.string()).default([]),
  targetAudience: Joi.array().items(Joi.string()).default([])
});

const updateAssetSchema = Joi.object({
  title: Joi.string().optional(),
  category: Joi.string().valid(...categories).optional(),
  description: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('active', 'archived', 'inactive').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  services: Joi.array().items(Joi.string()).optional(),
  targetAudience: Joi.array().items(Joi.string()).optional()
});

const listAssetQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().valid(...categories).optional(),
  status: Joi.string().valid('active', 'archived', 'inactive').optional()
});

module.exports = {
  categories,
  registerAssetSchema,
  updateAssetSchema,
  listAssetQuerySchema
};
