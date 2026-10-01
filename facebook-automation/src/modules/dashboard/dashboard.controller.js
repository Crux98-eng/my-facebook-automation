const dashboardService = require('./dashboard.service');
const response = require('../../utils/response');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const summary = await dashboardService.getDashboardSummary();
      return response.success(res, summary);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
