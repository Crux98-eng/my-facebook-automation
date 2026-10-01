const emailService = require('../src/modules/notifications/email.service');
const notificationService = require('../src/modules/notifications/notification.service');

describe('Email Notification Module Tests', () => {
  it('should trigger lead email notification for high-intent leads', async () => {
    const mockLead = {
      id: 'lead-uuid-12345',
      facebook_user_name: 'John Doe',
      lead_score: 92,
      intent: 'pricing_inquiry',
      service_interest: 'logo design',
      message: 'How much would you charge to make a logo like this?',
      created_at: new Date().toISOString()
    };

    const spy = jest.spyOn(emailService, 'sendLeadNotificationEmail').mockResolvedValue({ id: 'msg-123' });

    await notificationService.notifyNewLead(mockLead);

    expect(spy).toHaveBeenCalledWith(mockLead);
    spy.mockRestore();
  });
});
