const emailService = require('./email.service');
const config = require('../../config/env');
const logger = require('../../config/logger');

class NotificationService {
  async notifyNewLead(lead) {
    if (!config.automation.leadEmailNotifications) {
      logger.info('Lead email notifications are disabled in automation settings.');
      return;
    }

    try {
      await emailService.sendLeadNotificationEmail(lead);
    } catch (err) {
      logger.error(`Error sending lead notification for lead ${lead.id}`, err);
    }
  }
}

module.exports = new NotificationService();
