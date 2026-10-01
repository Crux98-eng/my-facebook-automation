const OpenAI = require('openai');
const config = require('../../config/env');
const logger = require('../../config/logger');
const { AIProviderError, ValidationError } = require('../../utils/errors');
const { retry } = require('../../utils/retry');

class VisionService {
  constructor() {
    if (config.ai.apiKey && config.ai.apiKey !== 'mock_ai_key') {
      this.client = new OpenAI({
        apiKey: config.ai.apiKey,
        baseURL: config.ai.baseUrl || undefined
      });
    } else {
      this.client = null;
    }
  }

  validateCdnDomain(cdnUrl) {
    try {
      const urlHost = new URL(cdnUrl).hostname;
      const configuredHost = new URL(config.r2.publicBaseUrl).hostname;
      if (urlHost !== configuredHost && config.env !== 'test') {
        throw new ValidationError(`Image URL domain '${urlHost}' does not match configured CDN host '${configuredHost}'`);
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      // Allow relative or mock URLs in test environment
      if (config.env !== 'test') {
        throw new ValidationError(`Invalid image CDN URL: ${cdnUrl}`);
      }
    }
  }

  async analyzeImage(cdnUrl, category = 'other', title = '') {
    this.validateCdnDomain(cdnUrl);

    if (!this.client || process.env.MOCK_EXTERNAL_APIS === 'true') {
      logger.info(`[VisionService] AI API key missing, mock mode or offline. Returning structured analysis for: ${cdnUrl}`);
      return this.getMockAnalysis(category, title);
    }

    const prompt = `Analyze this creative design image: ${cdnUrl}.
Category: ${category}
Title: ${title}

Respond ONLY with a valid JSON object following this exact schema:
{
  "asset_type": "string describing design type",
  "visual_style": "aesthetic description",
  "services": ["services demonstrated e.g. logo design"],
  "target_audience": ["target customer profiles"],
  "industries": ["relevant industries"],
  "colors": ["primary colors"],
  "composition": "description of composition",
  "professionalism": "high / medium / executive",
  "marketing_angles": ["marketing hooks"],
  "keywords": ["marketing keywords"],
  "suggested_cta": "suggested call-to-action text",
  "suggested_hashtags": ["list of hashtags"],
  "analysis_version": 1,
  "analysis_model": "${config.ai.visionModel}",
  "prompt_version": "asset-analysis-v1"
}`;

    try {
      const rawResult = await retry(async () => {
        const response = await this.client.chat.completions.create({
          model: config.ai.visionModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: cdnUrl } }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1000
        });

        const rawContent = response.choices[0].message.content;
        return JSON.parse(rawContent);
      }, { maxAttempts: 2 });

      return {
        ...rawResult,
        analysis_version: 1,
        analysis_model: config.ai.visionModel,
        analyzed_at: new Date().toISOString(),
        prompt_version: 'asset-analysis-v1'
      };
    } catch (err) {
      logger.error('Vision analysis error', err);
      if (config.env === 'development' || config.env === 'test') {
        return this.getMockAnalysis(category, title);
      }
      throw new AIProviderError(`Failed to analyze image with vision model: ${err.message}`);
    }
  }

  getMockAnalysis(category, title) {
    return {
      asset_type: category.replace('_', ' '),
      visual_style: 'Modern, clean aesthetic with balanced composition and strong visual contrast.',
      services: [category.replace('_', ' '), 'brand identity', 'graphic design'],
      target_audience: ['small businesses', 'startups', 'entrepreneurs'],
      industries: ['general business', 'services', 'retail'],
      colors: ['blue', 'black', 'white'],
      composition: 'Centrally balanced layout optimized for visual engagement.',
      professionalism: 'high',
      marketing_angles: ['Elevate your visual identity', 'Stand out from competitors'],
      keywords: [category, 'branding', 'design', 'business identity'],
      suggested_cta: 'Looking for a custom design for your business? Send us a DM today!',
      suggested_hashtags: [`#${category.replace('_', '')}`, '#branding', '#designagency', '#logodesign', '#graphicdesign'],
      analysis_version: 1,
      analysis_model: config.ai.visionModel,
      analyzed_at: new Date().toISOString(),
      prompt_version: 'asset-analysis-v1'
    };
  }
}

module.exports = new VisionService();
