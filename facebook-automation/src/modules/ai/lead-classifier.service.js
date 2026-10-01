const OpenAI = require('openai');
const config = require('../../config/env');
const logger = require('../../config/logger');
const { AIProviderError } = require('../../utils/errors');
const { retry } = require('../../utils/retry');

class LeadClassifierService {
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

  async classifyInteraction(messageText, postContext = {}) {
    if (!messageText || typeof messageText !== 'string') {
      return this.getFallbackClassification(messageText);
    }

    if (!this.client || process.env.MOCK_EXTERNAL_APIS === 'true') {
      logger.info(`[LeadClassifierService] AI API key missing or mock mode. Running rule-based lead classification.`);
      return this.ruleBasedClassification(messageText, postContext);
    }

    const prompt = `Analyze this incoming Facebook interaction message to evaluate buyer lead intent.

User Message: "${messageText}"
Context: ${JSON.stringify(postContext)}

Classify the user intent into ONE of these categories:
- pricing_inquiry (asks about prices, rates, packages)
- explicit_service_need (asks to hire, order, build design)
- purchase_intent (wants to buy, asks how to pay/order)
- question (asks general questions about service)
- general_engagement (compliment, emoji, general comment e.g. "nice work", "🔥")
- partnership (asks for collaboration/job)
- complaint (negative feedback)
- spam (irrelevant ads, link drops, bot spam)
- irrelevant (unrelated text)

SCORING RULES (0 to 100):
- Pricing inquiry: base 60-75
- Explicit service need / purchase intent: base 80-95
- Provided phone / email / WhatsApp: +15
- General compliment ("nice design!", 🔥): 5-15
- Spam / complaint: 0

Respond ONLY with a valid JSON object matching this schema:
{
  "isPotentialLead": boolean,
  "intent": "pricing_inquiry | question | explicit_service_need | purchase_intent | general_engagement | partnership | complaint | spam | irrelevant",
  "leadScore": number (0-100),
  "serviceInterest": "string describing specific design service requested or null",
  "urgency": "low | medium | high",
  "businessName": "extracted business name or null",
  "location": "extracted location or null",
  "budget": "extracted budget or null",
  "extractedPhone": "extracted phone number or null",
  "extractedEmail": "extracted email or null",
  "reason": "short explanation for classification"
}`;

    try {
      return await retry(async () => {
        const response = await this.client.chat.completions.create({
          model: config.ai.model,
          messages: [
            { role: 'system', content: 'You are an AI lead classification system for Facebook marketing.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500
        });

        const rawContent = response.choices[0].message.content;
        return JSON.parse(rawContent);
      }, { maxAttempts: 2 });
    } catch (err) {
      logger.error('Lead classification error', err);
      return this.ruleBasedClassification(messageText, postContext);
    }
  }

  ruleBasedClassification(messageText, postContext = {}) {
    const text = messageText.toLowerCase();

    // Spam check
    if (text.includes('crypto') || text.includes('whatsapp link') || text.includes('earn money') || text.includes('t.me/')) {
      return {
        isPotentialLead: false,
        intent: 'spam',
        leadScore: 0,
        serviceInterest: null,
        urgency: 'low',
        businessName: null,
        location: null,
        budget: null,
        extractedPhone: null,
        extractedEmail: null,
        reason: 'Detected spam keywords.'
      };
    }

    // Phone / Email extraction regex
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    const hasPhone = !!phoneMatch;
    const hasEmail = !!emailMatch;

    // Triggers
    const pricingTriggers = ['how much', 'price', 'cost', 'rate', 'quote', 'pricing', 'charge'];
    const serviceTriggers = ['need a logo', 'make me', 'order', 'design for my', 'can you do', 'can you make', 'want a design', 'hire you', 'make one for my'];

    let intent = 'general_engagement';
    let isPotentialLead = false;
    let score = 10;
    let urgency = 'low';

    if (serviceTriggers.some(term => text.includes(term))) {
      intent = 'explicit_service_need';
      isPotentialLead = true;
      score = 85;
      urgency = 'high';
    } else if (pricingTriggers.some(term => text.includes(term))) {
      intent = 'pricing_inquiry';
      isPotentialLead = true;
      score = 70;
      urgency = 'medium';
    } else if (hasPhone || hasEmail) {
      intent = 'purchase_intent';
      isPotentialLead = true;
      score = 80;
      urgency = 'high';
    } else if (text.includes('?') || text.includes('how')) {
      intent = 'question';
      isPotentialLead = true;
      score = 45;
      urgency = 'medium';
    }

    if (hasPhone) score = Math.min(100, score + 15);
    if (hasEmail) score = Math.min(100, score + 15);

    return {
      isPotentialLead,
      intent,
      leadScore: score,
      serviceInterest: postContext.service || 'logo design',
      urgency,
      businessName: null,
      location: null,
      budget: null,
      extractedPhone: phoneMatch ? phoneMatch[0] : null,
      extractedEmail: emailMatch ? emailMatch[0] : null,
      reason: isPotentialLead ? 'Text indicates buyer interest or inquiry.' : 'General comment or compliment.'
    };
  }

  getFallbackClassification(messageText) {
    return {
      isPotentialLead: false,
      intent: 'irrelevant',
      leadScore: 0,
      serviceInterest: null,
      urgency: 'low',
      businessName: null,
      location: null,
      budget: null,
      extractedPhone: null,
      extractedEmail: null,
      reason: 'Empty or invalid message.'
    };
  }
}

module.exports = new LeadClassifierService();
