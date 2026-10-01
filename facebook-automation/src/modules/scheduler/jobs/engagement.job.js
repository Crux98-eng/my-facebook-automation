const facebookService = require('../../facebook/facebook.service');
const postRepository = require('../../posts/post.repository');
const leadService = require('../../leads/lead.service');
const logger = require('../../../config/logger');

class EngagementJob {
  async execute() {
    logger.info('[Scheduler] Executing engagement polling job...');

    try {
      // Get recently published posts
      const recentPosts = await postRepository.findAll({ status: 'published', limit: 10 });
      if (recentPosts.items.length === 0) {
        return { checkedPosts: 0 };
      }

      let totalNewComments = 0;
      for (const post of recentPosts.items) {
        if (!post.facebook_post_id) continue;

        const comments = await facebookService.fetchComments(post.facebook_post_id);
        for (const comment of comments) {
          await leadService.processFacebookCommentEvent({
            commentId: comment.id,
            postId: post.facebook_post_id,
            message: comment.message,
            userId: comment.from?.id,
            userName: comment.from?.name,
            createdTime: comment.created_time
          });
          totalNewComments++;
        }
      }

      logger.info(`[Scheduler] Engagement job finished. Processed ${totalNewComments} comment(s).`);
      return { checkedPosts: recentPosts.items.length, processedComments: totalNewComments };
    } catch (err) {
      logger.error('[Scheduler] Error in engagement job', err);
      return { error: err.message };
    }
  }
}

module.exports = new EngagementJob();
