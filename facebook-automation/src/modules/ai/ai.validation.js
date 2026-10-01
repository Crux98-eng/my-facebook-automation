const Joi = require('joi');

const generateContentSchema = Joi.object({
  assetId: Joi.string().uuid().required(),
  contentStyle: Joi.string().valid('professional', 'casual', 'promotional', 'storytelling').default('professional'),
  objective: Joi.string().valid('generate_leads', 'brand_awareness', 'engagement').default('generate_leads'),
  templateId: Joi.string().uuid().optional()
});

module.exports = {
  generateContentSchema
};
