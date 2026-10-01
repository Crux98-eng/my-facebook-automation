const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  
  DATABASE_URL: Joi.string().required().description('PostgreSQL Connection String'),
  
  JWT_SECRET: Joi.string().min(16).default('default_jwt_secret_key_change_me_in_prod'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  
  R2_ACCOUNT_ID: Joi.string().allow('').optional(),
  R2_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  R2_BUCKET_NAME: Joi.string().default('facebook-assets'),
  R2_PUBLIC_BASE_URL: Joi.string().uri().default('https://cdn.example.com'),
  
  META_APP_ID: Joi.string().allow('').optional(),
  META_APP_SECRET: Joi.string().allow('').optional(),
  META_PAGE_ID: Joi.string().allow('').optional(),
  META_PAGE_ACCESS_TOKEN: Joi.string().allow('').optional(),
  META_VERIFY_TOKEN: Joi.string().default('meta_verify_token'),
  META_GRAPH_API_VERSION: Joi.string().default('v19.0'),
  
  AI_PROVIDER: Joi.string().default('openrouter'),
  OPENROUTER_API_KEY: Joi.string().allow('').optional(),
  AI_API_KEY: Joi.string().allow('').optional(),
  AI_MODEL: Joi.string().default('openai/gpt-4o-mini'),
  AI_VISION_MODEL: Joi.string().default('openai/gpt-4o-mini'),
  AI_BASE_URL: Joi.string().allow('').default('https://openrouter.ai/api/v1'),
  
  RESEND_API_KEY: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().default('notifications@example.com'),
  LEAD_NOTIFICATION_EMAIL: Joi.string().email().default('admin@example.com'),
  
  POSTS_PER_DAY: Joi.number().integer().min(1).default(2),
  POSTING_ENABLED: Joi.boolean().default(true),
  AUTO_PUBLISH: Joi.boolean().default(false),
  LEAD_DETECTION_ENABLED: Joi.boolean().default(true),
  LEAD_EMAIL_NOTIFICATIONS: Joi.boolean().default(true),
  MIN_LEAD_SCORE: Joi.number().integer().min(0).max(100).default(60),
  ASSET_POST_COOLDOWN_HOURS: Joi.number().integer().default(168)
}).unknown();

const { value: envVars, error } = envSchema.validate(process.env);

if (error && process.env.NODE_ENV !== 'test') {
  throw new Error(`Environment validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  db: {
    url: envVars.DATABASE_URL
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN
  },
  r2: {
    accountId: envVars.R2_ACCOUNT_ID,
    accessKeyId: envVars.R2_ACCESS_KEY_ID,
    secretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
    bucketName: envVars.R2_BUCKET_NAME,
    publicBaseUrl: envVars.R2_PUBLIC_BASE_URL
  },
  meta: {
    appId: envVars.META_APP_ID,
    appSecret: envVars.META_APP_SECRET,
    pageId: envVars.META_PAGE_ID,
    accessToken: envVars.META_PAGE_ACCESS_TOKEN,
    verifyToken: envVars.META_VERIFY_TOKEN,
    apiVersion: envVars.META_GRAPH_API_VERSION
  },
  ai: {
    provider: envVars.AI_PROVIDER === 'open-router' ? 'openrouter' : envVars.AI_PROVIDER,
    apiKey: envVars.OPENROUTER_API_KEY || envVars.AI_API_KEY,
    model: envVars.AI_MODEL.includes('/') ? envVars.AI_MODEL : `openai/${envVars.AI_MODEL}`,
    visionModel: envVars.AI_VISION_MODEL.includes('/') ? envVars.AI_VISION_MODEL : `openai/${envVars.AI_VISION_MODEL}`,
    baseUrl: envVars.AI_BASE_URL
  },
  resend: {
    apiKey: envVars.RESEND_API_KEY,
    from: envVars.EMAIL_FROM,
    leadEmail: envVars.LEAD_NOTIFICATION_EMAIL
  },
  automation: {
    postsPerDay: envVars.POSTS_PER_DAY,
    postingEnabled: envVars.POSTING_ENABLED,
    autoPublish: envVars.AUTO_PUBLISH,
    leadDetectionEnabled: envVars.LEAD_DETECTION_ENABLED,
    leadEmailNotifications: envVars.LEAD_EMAIL_NOTIFICATIONS,
    minLeadScore: envVars.MIN_LEAD_SCORE,
    assetCooldownHours: envVars.ASSET_POST_COOLDOWN_HOURS
  }
};
