# AI Provider Setup & Abstraction Guide

## 1. Provider Abstraction

The AI engine uses an abstraction layer (`ai.service.js`, `vision.service.js`, `content.service.js`, `lead-classifier.service.js`) allowing model/provider swaps without refactoring backend code.

Supported Environment Variables:
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=openai/gpt-4o-mini
AI_VISION_MODEL=openai/gpt-4o-mini
AI_BASE_URL=https://openrouter.ai/api/v1
```

The application uses the OpenAI-compatible SDK with OpenRouter's API endpoint. `OPENROUTER_API_KEY` is preferred; `AI_API_KEY` remains a fallback for existing deployments. Set both model variables to model IDs available in your OpenRouter account.

## 2. Model Roles

1. **Vision Model (`AI_VISION_MODEL`)**: Analyzes R2 design asset image URLs for aesthetics, customer segments, services, colors, composition, and marketing angles.
2. **Text Model (`AI_MODEL`)**: Generates Facebook post captions, CTAs, hashtags, and classifies incoming buyer interaction intent.

## 3. Lead Intent Categories & Scoring

* `pricing_inquiry`: User asks about cost/rate (Score: 60-75)
* `explicit_service_need`: User asks for a custom design (Score: 80-95)
* `purchase_intent`: User asks how to order/pay or provides phone/email (Score: 80-100)
* `general_engagement`: Compliment or emoji (Score: 5-15)
* `spam`: Link drops or bot ads (Score: 0)

Threshold configuration:
```env
MIN_LEAD_SCORE=60
```
Leads meeting or exceeding this threshold trigger instant email notifications.
