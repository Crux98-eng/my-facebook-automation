const facebookClient = require('./facebook.client');
const config = require('../../config/env');
const logger = require('../../config/logger');

class FacebookService {
  async publishPost(generatedPost, asset) {
    logger.info(`Publishing generated post ID: ${generatedPost.id} for asset: ${asset.title}`);

    const captionWithHashtags = this.formatFullCaption(
      generatedPost.caption,
      generatedPost.cta,
      generatedPost.hashtags
    );

    let result;
    if (asset && asset.cdn_url) {
      result = await facebookClient.publishPhotoPost({
        url: asset.cdn_url,
        caption: captionWithHashtags
      });
    } else {
      result = await facebookClient.publishTextPost({
        message: captionWithHashtags
      });
    }

    return result;
  }

  formatFullCaption(caption, cta, hashtags = []) {
    let full = caption;
    if (cta) {
      full += `\n\n👉 ${cta}`;
    }
    if (Array.isArray(hashtags) && hashtags.length > 0) {
      const hashtagStr = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      full += `\n\n${hashtagStr}`;
    }
    return full;
  }

  async fetchComments(facebookPostId) {
    return await facebookClient.getPostComments(facebookPostId);
  }

  getMetaConnectionStatus() {
    return {
      connected: !!(config.meta.pageId && config.meta.accessToken && config.meta.accessToken !== 'mock_page_token'),
      pageId: config.meta.pageId || null,
      apiVersion: config.meta.apiVersion,
      autoPublish: config.automation.autoPublish
    };
  }
}

module.exports = new FacebookService();
