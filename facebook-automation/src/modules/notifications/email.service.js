const { Resend } = require('resend');
const config = require('../../config/env');
const logger = require('../../config/logger');

class EmailService {
  constructor() {
    if (config.resend.apiKey && config.resend.apiKey !== 're_mock_key') {
      this.resend = new Resend(config.resend.apiKey);
    } else {
      this.resend = null;
    }
  }

  async sendLeadNotificationEmail(lead) {
    const to = config.resend.leadEmail;
    const from = config.resend.from;

    const subject = `🔥 New Facebook Lead — ${lead.service_interest || 'Design Inquiry'}`;

    const htmlBody = `
      <h2>🔥 Potential Facebook Lead Detected</h2>
      <p><strong>Name:</strong> ${lead.facebook_user_name || 'Facebook User'}</p>
      <p><strong>Lead Score:</strong> ${lead.lead_score} / 100</p>
      <p><strong>Intent:</strong> ${lead.intent}</p>
      <p><strong>Service Interest:</strong> ${lead.service_interest || 'N/A'}</p>
      <p><strong>Message:</strong> "${lead.message}"</p>
      <hr />
      <p><strong>Email:</strong> ${lead.email || 'Not provided'}</p>
      <p><strong>Phone:</strong> ${lead.phone || 'Not provided'}</p>
      <p><strong>Business Name:</strong> ${lead.business_name || 'Unknown'}</p>
      <p><strong>Location:</strong> ${lead.location || 'Unknown'}</p>
      <p><strong>Detected At:</strong> ${lead.created_at || new Date().toISOString()}</p>
    `;

    if (!this.resend) {
      logger.info(`[EmailService] Resend API key missing or mock. Simulating email to ${to}: ${subject}`);
      return { id: 'mock-email-id', simulated: true };
    }

    try {
      const data = await this.resend.emails.send({
        from,
        to,
        subject,
        html: htmlBody
      });
      logger.info(`Lead notification email sent successfully! Message ID: ${data.id}`);
      return data;
    } catch (err) {
      logger.error('Failed to send Resend email', err);
      throw err;
    }
  }
}

module.exports = new EmailService();
