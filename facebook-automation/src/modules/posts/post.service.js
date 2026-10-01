const postRepository = require('./post.repository');
const assetService = require('../assets/asset.service');
const aiService = require('../ai/ai.service');
const facebookService = require('../facebook/facebook.service');
const config = require('../../config/env');
const { NotFoundError, ValidationError, FacebookAPIError } = require('../../utils/errors');
const logger = require('../../config/logger');

class PostService {
  async generatePostContent(data) {
    const { assetId, contentStyle = 'professional', objective = 'generate_leads' } = data;

    // Load asset
    const asset = await assetService.getAssetById(assetId);

    // Duplicate check - Check asset cooldown
    const isRecentlyPosted = await postRepository.checkRecentlyPostedAsset(assetId, config.automation.assetCooldownHours);
    if (isRecentlyPosted) {
      logger.warn(`Asset ${assetId} was recently posted or scheduled within cooldown period (${config.automation.assetCooldownHours}h)`);
    }

    // Perform AI analysis if not already analyzed
    if (asset.ai_analysis_status !== 'completed') {
      await aiService.analyzeAsset(asset);
    }

    // Generate Facebook post content via AI
    const generated = await aiService.generateContent(asset, { contentStyle, objective });

    // Store draft post in database
    const postRecord = await postRepository.create({
      asset_id: asset.id,
      caption: generated.caption,
      cta: generated.cta,
      hashtags: generated.hashtags,
      target_audience: generated.targetAudience,
      ai_metadata: {
        leadIntentKeywords: generated.leadIntentKeywords,
        contentStyle,
        objective
      },
      status: 'draft'
    });

    return postRecord;
  }

  async createPost(data) {
    const asset = await assetService.getAssetById(data.assetId);
    return await postRepository.create({
      asset_id: asset.id,
      template_id: data.templateId,
      caption: data.caption,
      cta: data.cta,
      hashtags: data.hashtags,
      target_audience: data.targetAudience,
      status: data.status || 'draft',
      scheduled_at: data.scheduledAt
    });
  }

  async getPostById(id) {
    const post = await postRepository.findById(id);
    if (!post) {
      throw new NotFoundError(`Post with ID ${id} not found`);
    }
    return post;
  }

  async listPosts(query) {
    return await postRepository.findAll(query);
  }

  async publishPost(postId) {
    const post = await this.getPostById(postId);

    if (post.status === 'published') {
      throw new ValidationError(`Post ${postId} has already been published to Facebook`);
    }
    if (post.status === 'publishing') {
      throw new ValidationError(`Post ${postId} is currently being published`);
    }

    // Set post status to publishing (idempotency guard)
    await postRepository.update(postId, { status: 'publishing' });

    try {
      const asset = await assetService.getAssetById(post.asset_id);
      
      // Execute publication via Meta Graph API
      const result = await facebookService.publishPost(post, asset);

      // Update generated_posts & asset.times_posted inside a database transaction
      const publishedPost = await postRepository.markPublished(
        postId,
        result.facebookPostId,
        result.facebookPermalink
      );

      logger.info(`Successfully published post ${postId} to Facebook! Post ID: ${result.facebookPostId}`);
      return publishedPost;
    } catch (err) {
      logger.error(`Failed to publish post ${postId} to Facebook`, err);
      await postRepository.markFailed(postId, err.message);
      throw err;
    }
  }

  async schedulePost(postId, scheduledAt) {
    const post = await this.getPostById(postId);
    if (post.status === 'published') {
      throw new ValidationError(`Cannot schedule an already published post`);
    }

    const updated = await postRepository.update(postId, {
      status: 'scheduled',
      scheduled_at: scheduledAt
    });
    logger.info(`Scheduled post ${postId} for execution at ${scheduledAt}`);
    return updated;
  }

  async cancelPost(postId) {
    const post = await this.getPostById(postId);
    if (post.status === 'published') {
      throw new ValidationError(`Cannot cancel an already published post`);
    }

    const updated = await postRepository.update(postId, {
      status: 'cancelled'
    });
    logger.info(`Cancelled post ${postId}`);
    return updated;
  }

  async getDueScheduledPosts() {
    return await postRepository.findDueScheduledPosts();
  }
}

module.exports = new PostService();
