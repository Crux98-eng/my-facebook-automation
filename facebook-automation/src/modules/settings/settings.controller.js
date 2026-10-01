const settingsService = require('./settings.service');
const response = require('../../utils/response');

class SettingsController {
  async getStatus(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      return response.success(res, settings);
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const updated = await settingsService.updateSettings(req.body);
      return response.success(res, updated, 'Automation settings updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async runAutomation(req, res, next) {
    try {
      const results = await settingsService.runManualAutomationCycle();
      return response.success(res, results, 'Manual automation cycle triggered successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SettingsController();
