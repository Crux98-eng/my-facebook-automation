const assetService = require('../../assets/asset.service');
const postService = require('../../posts/post.service');
const config = require('../../../config/env');
const logger = require('../../../config/logger');

class ContentGenerationJob {
  async execute() {
    if (!config.automation.postingEnabled) {
      logger.info('[Scheduler] Content generation job skipped (POSTING_ENABLED=false)');
      return { skipped: true, reason: 'POSTING_ENABLED is false' };
    }

    logger.info('[Scheduler] Executing daily content generation job...');

    try {
      // Find eligible assets adhering to cooldown
      const eligibleAssets = await assetService.getEligibleAssetsForPosting(config.automation.assetCooldownHours);
      
      if (eligibleAssets.length === 0) {
        logger.info('[Scheduler] No eligible assets found for new post generation.');
        return { generatedCount: 0 };
      }

      // Generate posts up to POSTS_PER_DAY
      const targetCount = Math.min(config.automation.postsPerDay, eligibleAssets.length);
      const generatedPosts = [];

      for (let i = 0; i < targetCount; i++) {
        const asset = eligibleAssets[i];
        logger.info(`[Scheduler] Generating post for eligible asset: ${asset.id} (${asset.title})`);
        
        const post = await postService.generatePostContent({
          assetId: asset.id,
          contentStyle: 'professional',
          objective: 'generate_leads'
        });

        // If AUTO_PUBLISH=true, set status to scheduled for immediate or upcoming publishing
        if (config.automation.autoPublish) {
          const scheduledTime = new Date(Date.now() + (i + 1) * 60 * 60 * 1000);
          await postService.schedulePost(post.id, scheduledTime.toISOString());
        }

        generatedPosts.push(post);
      }

      logger.info(`[Scheduler] Content generation job finished. Generated ${generatedPosts.length} post(s).`);
      return { generatedCount: generatedPosts.length, posts: generatedPosts };
    } catch (err) {
      logger.error('[Scheduler] Error in content generation job', err);
      throw err;
    }
  }
}

module.exports = new ContentGenerationJob();
