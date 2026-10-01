const visionService = require('./vision.service');
const contentService = require('./content.service');
const leadClassifierService = require('./lead-classifier.service');
const assetRepository = require('../assets/asset.repository');
const logger = require('../../config/logger');

class AIService {
  async analyzeAsset(asset) {
    logger.info(`Analyzing asset vision & metadata: ${asset.id} (${asset.cdn_url})`);
    
    // Call vision model
    const analysisResult = await visionService.analyzeImage(asset.cdn_url, asset.category, asset.title);

    // Save result to asset repository
    const updatedAsset = await assetRepository.updateAnalysis(asset.id, analysisResult);
    return updatedAsset;
  }

  async generateContent(asset, options = {}) {
    logger.info(`Generating marketing content for asset ID: ${asset.id}`);
    return await contentService.generatePostContent(asset, options);
  }

  async classifyLead(messageText, postContext = {}) {
    logger.info(`Classifying interaction message: "${messageText.slice(0, 50)}..."`);
    return await leadClassifierService.classifyInteraction(messageText, postContext);
  }
}

module.exports = new AIService();
