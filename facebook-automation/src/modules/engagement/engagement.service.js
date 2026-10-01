const engagementRepository = require('./engagement.repository');
const logger = require('../../config/logger');

class EngagementService {
  async trackEngagement(data) {
    const recorded = await engagementRepository.recordEngagement(data);
    if (recorded) {
      logger.info(`Recorded engagement: type=${data.engagement_type}, user=${data.facebook_user_name || data.facebook_user_id}`);
    }
    return recorded;
  }
}

module.exports = new EngagementService();
