const leadClassifierService = require('../src/modules/ai/lead-classifier.service');

describe('Lead Classification & Scoring Logic Tests', () => {
  it('Scenario 1: "How much is a logo?" should be classified as pricing inquiry potential lead', async () => {
    const res = await leadClassifierService.classifyInteraction('How much is a logo?');
    expect(res.isPotentialLead).toBe(true);
    expect(res.intent).toBe('pricing_inquiry');
    expect(res.leadScore).toBeGreaterThanOrEqual(60);
  });

  it('Scenario 2: "Nice design!" should be classified as general engagement', async () => {
    const res = await leadClassifierService.classifyInteraction('Nice design!');
    expect(res.intent).toBe('general_engagement');
    expect(res.leadScore).toBeLessThan(50);
  });

  it('Scenario 3: "Can you make one for my business?" should be classified as explicit service need', async () => {
    const res = await leadClassifierService.classifyInteraction('Can you make one for my business?');
    expect(res.isPotentialLead).toBe(true);
    expect(res.intent).toBe('explicit_service_need');
    expect(res.leadScore).toBeGreaterThanOrEqual(75);
  });

  it('Scenario 4: "🔥🔥🔥" should not be classified as a lead', async () => {
    const res = await leadClassifierService.classifyInteraction('🔥🔥🔥');
    expect(res.isPotentialLead).toBe(false);
    expect(res.leadScore).toBeLessThan(30);
  });

  it('Scenario 5: "Send me your price and WhatsApp number." should be classified as high-intent lead', async () => {
    const res = await leadClassifierService.classifyInteraction('Send me your price and WhatsApp number.');
    expect(res.isPotentialLead).toBe(true);
    expect(res.leadScore).toBeGreaterThanOrEqual(70);
  });
});
