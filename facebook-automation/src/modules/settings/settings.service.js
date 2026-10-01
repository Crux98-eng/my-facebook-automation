const settingsRepository = require('./settings.repository');
const assetSelectionService = require('../assets/asset-selection.service');
const postService = require('../posts/post.service');
const config = require('../../config/env');
const logger = require('../../config/logger');

class SettingsService {
  async getSettings() {
    return await settingsRepository.getSettings();
  }

  async updateSettings(data) {
    const updated = await settingsRepository.updateSettings(data);
    
    if (updated.posting_enabled !== undefined) config.automation.postingEnabled = updated.posting_enabled;
    if (updated.auto_publish !== undefined) config.automation.autoPublish = updated.auto_publish;
    if (updated.lead_detection_enabled !== undefined) config.automation.leadDetectionEnabled = updated.lead_detection_enabled;
    if (updated.lead_email_notifications_enabled !== undefined) config.automation.leadEmailNotifications = updated.lead_email_notifications_enabled;
    if (updated.minimum_lead_score !== undefined) config.automation.minLeadScore = updated.minimum_lead_score;

    logger.info('Updated automation settings');
    return updated;
  }

  async runManualAutomationCycle() {
    logger.info('Triggered manual automation cycle execution');

    const selectedAsset = await assetSelectionService.selectNextAsset();
    if (!selectedAsset) {
      return {
        assetSelected: false,
        reason: 'No eligible assets found for automation cycle'
      };
    }

    const postDraft = await postService.generatePostContent({
      assetId: selectedAsset.id,
      contentStyle: 'professional',
      objective: 'generate_leads'
    });

    let published = false;
    let publishResult = null;
    let publishReason = 'AUTO_PUBLISH=false';

    if (config.automation.autoPublish) {
      try {
        publishResult = await postService.publishPost(postDraft.id);
        published = true;
        publishReason = 'Published successfully';
      } catch (err) {
        publishReason = `Publish failed: ${err.message}`;
      }
    }

    return {
      assetSelected: true,
      assetId: selectedAsset.id,
      assetTitle: selectedAsset.title,
      contentGenerated: true,
      postId: postDraft.id,
      published,
      reason: publishReason,
      facebookPostDetails: publishResult
    };
  }
}

module.exports = new SettingsService();
