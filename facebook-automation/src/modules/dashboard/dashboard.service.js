const dashboardRepository = require('./dashboard.repository');
const facebookService = require('../facebook/facebook.service');
const config = require('../../config/env');

class DashboardService {
  async getDashboardSummary() {
    const metrics = await dashboardRepository.getSummaryMetrics(config.automation.minLeadScore);
    const facebookStatus = facebookService.getMetaConnectionStatus();

    return {
      metrics,
      facebookConnection: facebookStatus,
      automationConfig: {
        postingEnabled: config.automation.postingEnabled,
        autoPublish: config.automation.autoPublish,
        postsPerDay: config.automation.postsPerDay,
        minLeadScore: config.automation.minLeadScore
      }
    };
  }
}

module.exports = new DashboardService();
