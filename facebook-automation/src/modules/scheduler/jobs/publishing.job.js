const postService = require('../../posts/post.service');
const config = require('../../../config/env');
const logger = require('../../../config/logger');

class PublishingJob {
  async execute() {
    if (!config.automation.postingEnabled) {
      logger.info('[Scheduler] Publishing job skipped (POSTING_ENABLED=false)');
      return { skipped: true, reason: 'POSTING_ENABLED is false' };
    }

    logger.info('[Scheduler] Executing scheduled publishing job...');

    try {
      const duePosts = await postService.getDueScheduledPosts();

      if (duePosts.length === 0) {
        logger.info('[Scheduler] No scheduled posts due for publishing.');
        return { publishedCount: 0 };
      }

      const results = [];
      for (const post of duePosts) {
        try {
          logger.info(`[Scheduler] Publishing due post ID: ${post.id}`);
          const published = await postService.publishPost(post.id);
          results.push({ id: post.id, success: true, published });
        } catch (err) {
          logger.error(`[Scheduler] Failed publishing scheduled post ${post.id}`, err);
          results.push({ id: post.id, success: false, error: err.message });
        }
      }

      logger.info(`[Scheduler] Publishing job finished. Processed ${results.length} post(s).`);
      return { publishedCount: results.filter(r => r.success).length, results };
    } catch (err) {
      logger.error('[Scheduler] Error in publishing job', err);
      throw err;
    }
  }
}

module.exports = new PublishingJob();
