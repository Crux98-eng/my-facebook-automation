const assetService = require('./asset.service');
const aiService = require('../ai/ai.service');
const response = require('../../utils/response');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

class AssetController {
  async register(req, res, next) {
    try {
      const asset = await assetService.registerAsset(req.body);
      return response.success(res, asset, 'Asset registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async syncR2(req, res, next) {
    try {
      const summary = await assetService.syncR2Assets();
      return response.success(res, summary, 'R2 assets synchronized successfully');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const asset = await assetService.getAssetById(req.params.id);
      return response.success(res, asset);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { category, status } = req.query;
      const { items, total } = await assetService.listAssets({ category, status, limit, offset });
      const paginated = formatPaginatedResponse(items, total, page, limit);
      return response.success(res, paginated);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await assetService.updateAsset(req.params.id, req.body);
      return response.success(res, updated, 'Asset updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      const deleted = await assetService.deleteAsset(req.params.id);
      return response.success(res, deleted, 'Asset deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async analyze(req, res, next) {
    try {
      const asset = await assetService.getAssetById(req.params.id);
      const analysisResult = await aiService.analyzeAsset(asset);
      return response.success(res, analysisResult, 'Asset analyzed successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AssetController();
