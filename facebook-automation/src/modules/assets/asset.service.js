const assetRepository = require('./asset.repository');
const r2Service = require('../../config/r2');
const config = require('../../config/env');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const logger = require('../../config/logger');

const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

class AssetService {
  validateCdnUrl(storageKey) {
    const cdnUrl = r2Service.getPublicUrl(storageKey);
    const configuredBase = new URL(config.r2.publicBaseUrl);
    const generatedUrl = new URL(cdnUrl);

    if (generatedUrl.hostname !== configuredBase.hostname) {
      throw new ValidationError(`Generated CDN URL host '${generatedUrl.hostname}' does not match configured CDN domain '${configuredBase.hostname}'`);
    }
    return cdnUrl;
  }

  async registerAsset(data) {
    const { storageKey, category, title, description, tags, services, targetAudience, fileName, mimeType, fileSize } = data;

    // Check existing by storageKey
    const existing = await assetRepository.findByStorageKey(storageKey);
    if (existing) {
      throw new ValidationError(`Asset with storage key '${storageKey}' is already registered in catalog`);
    }

    // Validate CDN URL host
    const cdnUrl = this.validateCdnUrl(storageKey);

    const newAsset = await assetRepository.create({
      storage_key: storageKey,
      cdn_url: cdnUrl,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      category,
      title,
      description,
      tags,
      services,
      target_audience: targetAudience
    });

    logger.info(`Registered new asset: ${newAsset.id} (${storageKey})`);
    return newAsset;
  }

  async syncR2Assets() {
    logger.info(`Starting R2 bucket synchronization for bucket: ${config.r2.bucketName}`);
    
    const r2Objects = await r2Service.list();
    let scanned = 0;
    let newAssets = 0;
    let existingAssets = 0;
    let skipped = 0;

    for (const obj of r2Objects) {
      scanned++;
      const key = obj.Key;
      if (!key) {
        skipped++;
        continue;
      }

      const lowerKey = key.toLowerCase();
      const isSupported = SUPPORTED_EXTENSIONS.some(ext => lowerKey.endsWith(ext));

      if (!isSupported) {
        logger.debug(`Skipping unsupported R2 object: ${key}`);
        skipped++;
        continue;
      }

      const existing = await assetRepository.findByStorageKey(key);
      if (existing) {
        existingAssets++;
        continue;
      }

      // Automatically infer title and category from storage key filename
      const fileName = key.split('/').pop();
      const titleWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      const title = titleWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      let category = 'other';
      if (lowerKey.includes('logo')) category = 'logo_design';
      else if (lowerKey.includes('brand')) category = 'branding';
      else if (lowerKey.includes('flyer')) category = 'flyer';
      else if (lowerKey.includes('poster')) category = 'poster';
      else if (lowerKey.includes('social')) category = 'social_media_design';

      const cdnUrl = this.validateCdnUrl(key);

      await assetRepository.create({
        storage_key: key,
        cdn_url: cdnUrl,
        file_name: fileName,
        mime_type: lowerKey.endsWith('.png') ? 'image/png' : 'image/jpeg',
        file_size: obj.Size || 0,
        category,
        title
      });

      newAssets++;
    }

    const summary = { scanned, newAssets, existingAssets, skipped };
    logger.info('R2 Bucket synchronization completed successfully', summary);
    return summary;
  }

  async getAssetById(id) {
    const asset = await assetRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }
    return asset;
  }

  async listAssets(query) {
    return await assetRepository.findAll(query);
  }

  async updateAsset(id, data) {
    await this.getAssetById(id);
    return await assetRepository.update(id, data);
  }

  async deleteAsset(id) {
    const asset = await this.getAssetById(id);
    await assetRepository.delete(id);
    logger.info(`Deleted asset: ${id}`);
    return asset;
  }

  async getEligibleAssetsForPosting(cooldownHours) {
    return await assetRepository.findEligibleForPost(cooldownHours);
  }
}

module.exports = new AssetService();
