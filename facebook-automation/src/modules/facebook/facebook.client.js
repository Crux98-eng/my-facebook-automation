const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../config/logger');
const { FacebookAPIError, AuthenticationError } = require('../../utils/errors');
const { retry } = require('../../utils/retry');

class FacebookClient {
  constructor() {
    this.apiVersion = config.meta.apiVersion || 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.pageId = config.meta.pageId;
    this.accessToken = config.meta.accessToken;
    this.isTokenDisabled = false;
  }

  get client() {
    return axios.create({
      baseURL: `https://graph.facebook.com/${config.meta.apiVersion || 'v19.0'}`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async checkCapabilities() {
    const token = this.accessToken;
    const pageId = this.pageId;

    if (!token || !pageId || token === 'mock_page_token' || pageId === 'mock_page_id' || process.env.MOCK_EXTERNAL_APIS === 'true') {
      return {
        connected: false,
        publishing: false,
        comments: false,
        messaging: false,
        insights: false,
        mockMode: true,
        reason: 'Using mock page credentials or MOCK_EXTERNAL_APIS=true'
      };
    }

    if (this.isTokenDisabled) {
      return {
        connected: false,
        publishing: false,
        comments: false,
        messaging: false,
        insights: false,
        disabled: true,
        reason: 'Page access token is marked invalid or expired'
      };
    }

    try {
      // Test page token & permissions via page details call
      const res = await this.client.get(`/${pageId}`, {
        params: {
          access_token: token,
          fields: 'id,name'
        }
      });

      return {
        connected: true,
        pageId: res.data.id,
        pageName: res.data.name,
        publishing: true,
        comments: true,
        messaging: true,
        insights: true,
        apiVersion: config.meta.apiVersion
      };
    } catch (err) {
      const isAuthError = err.response?.data?.error?.code === 190 || err.response?.status === 401;
      if (isAuthError) {
        this.isTokenDisabled = true;
        logger.error('[FacebookClient] CRITICAL: Meta Page Access Token is expired or invalid. Disabling Facebook publishing.');
      }
      return {
        connected: false,
        publishing: false,
        comments: false,
        messaging: false,
        insights: false,
        error: err.response?.data?.error?.message || err.message
      };
    }
  }

  async getPageAccessToken(targetPageId = null) {
    const pageId = targetPageId || this.pageId;
    if (!this.accessToken || this.accessToken === 'mock_page_token') return null;

    try {
      const res = await this.client.get('/me/accounts', {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,access_token'
        }
      });
      const pages = res.data?.data || [];
      const match = pages.find(p => p.id === pageId) || pages[0];
      return match ? match.access_token : this.accessToken;
    } catch (e) {
      return this.accessToken;
    }
  }

  async publishPhotoPost({ url, caption, pageAccessToken = null }) {
    if (this.isTokenDisabled) {
      throw new AuthenticationError('Facebook Page Access Token is disabled/expired. Update credentials.');
    }

    let token = pageAccessToken || await this.getPageAccessToken();
    const pageId = this.pageId;

    if (!token || !pageId || token === 'mock_page_token' || pageId === 'mock_page_id' || process.env.MOCK_EXTERNAL_APIS === 'true') {
      logger.info('[FacebookClient] Meta page credentials missing or mock mode. Returning mock Facebook post.');
      return this.getMockPostResponse();
    }

    const endpoint = `/${pageId}/photos`;

    try {
      return await retry(async () => {
        const response = await this.client.post(endpoint, {
          url,
          caption,
          access_token: token
        });
        const data = response.data;
        const postId = data.post_id || data.id;
        return {
          facebookPostId: postId,
          facebookPermalink: `https://facebook.com/${postId}`
        };
      });
    } catch (err) {
      const fbError = err.response?.data?.error;
      if (fbError?.code === 190 || err.response?.status === 401) {
        this.isTokenDisabled = true;
        logger.error('[FacebookClient] Facebook OAuth error: Token expired');
        throw new AuthenticationError('Facebook Page token expired');
      }
      const fbMessage = fbError?.message || err.message;
      logger.error('Meta Graph API photo publish failed', { error: fbMessage });
      throw new FacebookAPIError(`Facebook API photo publication failed: ${fbMessage}`);
    }
  }

  async publishTextPost({ message, pageAccessToken = null }) {
    if (this.isTokenDisabled) {
      throw new AuthenticationError('Facebook Page Access Token is disabled/expired.');
    }

    const token = pageAccessToken || this.accessToken;
    const pageId = this.pageId;

    if (!token || !pageId || token === 'mock_page_token' || pageId === 'mock_page_id' || process.env.MOCK_EXTERNAL_APIS === 'true') {
      return this.getMockPostResponse();
    }

    try {
      return await retry(async () => {
        const response = await this.client.post(`/${pageId}/feed`, {
          message,
          access_token: token
        });
        const data = response.data;
        return {
          facebookPostId: data.id,
          facebookPermalink: `https://facebook.com/${data.id}`
        };
      });
    } catch (err) {
      const fbMessage = err.response?.data?.error?.message || err.message;
      throw new FacebookAPIError(`Facebook API text publication failed: ${fbMessage}`);
    }
  }

  async getPostComments(postId, pageAccessToken = null) {
    const token = pageAccessToken || this.accessToken;
    if (!token || token === 'mock_page_token' || process.env.MOCK_EXTERNAL_APIS === 'true') return [];

    try {
      const response = await this.client.get(`/${postId}/comments`, {
        params: {
          access_token: token,
          fields: 'id,from,message,created_time'
        }
      });
      return response.data.data || [];
    } catch (err) {
      logger.error(`Failed to fetch comments for post ${postId}`, { error: err.message });
      return [];
    }
  }

  getMockPostResponse() {
    const randomId = `${this.pageId || '10002821'}_${Math.floor(100000000 + Math.random() * 900000000)}`;
    return {
      facebookPostId: randomId,
      facebookPermalink: `https://facebook.com/${randomId}`
    };
  }
}

module.exports = new FacebookClient();
