const OpenAI = require('openai');
const config = require('../../config/env');
const logger = require('../../config/logger');
const { AIProviderError } = require('../../utils/errors');
const { retry } = require('../../utils/retry');

class ContentService {
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

  async generatePostContent(asset, options = {}) {
    const { contentStyle = 'professional', objective = 'generate_leads', template = null } = options;

    if (!this.client || process.env.MOCK_EXTERNAL_APIS === 'true') {
      logger.info(`[ContentService] AI API key missing or mock mode. Returning fallback post content.`);
      return this.getMockContent(asset, contentStyle);
    }

    const prompt = `You are an expert social media copywriter creating a Facebook post for a design showcase asset.

ASSET DETAILS:
Title: ${asset.title}
Category: ${asset.category}
Description: ${asset.description || 'N/A'}
AI Analysis: ${JSON.stringify(asset.ai_analysis || {})}
Content Style: ${contentStyle}
Objective: ${objective}
${template ? `Custom Prompt Instructions: ${template.prompt}` : ''}

STRICT WRITING RULES:
1. Avoid false claims.
2. Avoid inventing fake customer testimonials or quotes.
3. Do NOT claim this work was done for a specific real client unless explicitly stated in asset description.
4. Keep tone natural, engaging, and professional.
5. Focus on generating genuine business inquiries.

Respond ONLY with a valid JSON object matching this schema:
{
  "caption": "Full Facebook post text written in engaging style",
  "cta": "Clear call to action prompt",
  "hashtags": ["list of 4-8 relevant hashtags including '#'"],
  "targetAudience": ["intended customer segments"],
  "leadIntentKeywords": ["keywords indicating buyer interest in comments"]
}`;

    try {
      return await retry(async () => {
        const response = await this.client.chat.completions.create({
          model: config.ai.model,
          messages: [
            { role: 'system', content: 'You are an elite marketing copywriter for creative design agencies.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 800
        });

        const rawContent = response.choices[0].message.content;
        return JSON.parse(rawContent);
      }, { maxAttempts: 2 });
    } catch (err) {
      logger.error('Content generation error', err);
      if (config.env === 'development') {
        return this.getMockContent(asset, contentStyle);
      }
      throw new AIProviderError(`Failed to generate post content: ${err.message}`);
    }
  }

  getMockContent(asset, contentStyle) {
    const title = asset.title || 'Creative Design Showcase';
    const category = (asset.category || 'design').replace('_', ' ');
    
    return {
      caption: `🎨 Take your brand to the next level with our latest ${category} concept: "${title}"!\n\nA clean visual identity helps your business make a memorable first impression. Whether you are launching a new startup or refreshing an existing brand, our team is ready to craft tailored designs for you.`,
      cta: 'Interested in upgrading your brand design? Send us a DM or comment "QUOTE" below to get started!',
      hashtags: [`#${asset.category || 'design'}`, '#brandidentity', '#graphicdesign', '#businessgrowth', '#logodesign'],
      targetAudience: ['Small Business Owners', 'Startups', 'Entrepreneurs'],
      leadIntentKeywords: ['price', 'cost', 'quote', 'how much', 'order', 'hire', 'interested']
    };
  }
}

module.exports = new ContentService();
