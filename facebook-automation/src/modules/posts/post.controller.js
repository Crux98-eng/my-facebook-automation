const postService = require('./post.service');
const response = require('../../utils/response');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

class PostController {
  async generate(req, res, next) {
    try {
      const generated = await postService.generatePostContent(req.body);
      return response.success(res, generated, 'Post content generated successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const post = await postService.createPost(req.body);
      return response.success(res, post, 'Post created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const post = await postService.getPostById(req.params.id);
      return response.success(res, post);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { status, assetId } = req.query;
      const { items, total } = await postService.listPosts({ status, asset_id: assetId, limit, offset });
      const paginated = formatPaginatedResponse(items, total, page, limit);
      return response.success(res, paginated);
    } catch (err) {
      next(err);
    }
  }

  async publish(req, res, next) {
    try {
      const postId = req.params.id || req.body.generatedPostId;
      const published = await postService.publishPost(postId);
      return response.success(res, published, 'Post published successfully');
    } catch (err) {
      next(err);
    }
  }

  async schedule(req, res, next) {
    try {
      const { scheduledAt } = req.body;
      const scheduled = await postService.schedulePost(req.params.id, scheduledAt);
      return response.success(res, scheduled, 'Post scheduled successfully');
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const cancelled = await postService.cancelPost(req.params.id);
      return response.success(res, cancelled, 'Post cancelled successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PostController();
