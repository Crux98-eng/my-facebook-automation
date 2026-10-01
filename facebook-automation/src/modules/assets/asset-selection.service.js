const assetRepository = require('./asset.repository');
const config = require('../../config/env');
const logger = require('../../config/logger');

class AssetSelectionService {
  async getEligibleAssets(cooldownHours = null) {
    const hours = cooldownHours || config.automation.assetCooldownHours;
    return await assetRepository.findEligibleForPost(hours);
  }

  async selectNextAsset(options = {}) {
    const { category = null, cooldownHours = null } = options;
    const eligibleAssets = await this.getEligibleAssets(cooldownHours);

    if (eligibleAssets.length === 0) {
      logger.info('No eligible assets available for post selection.');
      return null;
    }

    let filtered = eligibleAssets;
    if (category) {
      filtered = eligibleAssets.filter(a => a.category === category);
      if (filtered.length === 0) filtered = eligibleAssets; // fallback
    }

    // Sort by times_posted ASC, then last_posted_at ASC NULLS FIRST, then created_at DESC
    filtered.sort((a, b) => {
      if (a.times_posted !== b.times_posted) {
        return a.times_posted - b.times_posted;
      }
      if (!a.last_posted_at && b.last_posted_at) return -1;
      if (a.last_posted_at && !b.last_posted_at) return 1;
      if (a.last_posted_at && b.last_posted_at) {
        return new Date(a.last_posted_at) - new Date(b.last_posted_at);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const selected = filtered[0];
    logger.info(`Selected next asset for posting: ID=${selected.id}, Title="${selected.title}", TimesPosted=${selected.times_posted}`);
    return selected;
  }

  async selectAssetsForCampaign(count = 1, options = {}) {
    const eligible = await this.getEligibleAssets(options.cooldownHours);
    if (eligible.length === 0) return [];

    const selectedList = [];
    const usedIds = new Set();

    for (const asset of eligible) {
      if (selectedList.length >= count) break;
      if (!usedIds.has(asset.id)) {
        selectedList.push(asset);
        usedIds.add(asset.id);
      }
    }

    return selectedList;
  }
}

module.exports = new AssetSelectionService();
