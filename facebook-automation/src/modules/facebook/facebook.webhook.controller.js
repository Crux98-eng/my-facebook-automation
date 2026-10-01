const config = require('../../config/env');
const logger = require('../../config/logger');
const response = require('../../utils/response');
const { query } = require('../../config/database');
const facebookClient = require('./facebook.client');
const facebookService = require('./facebook.service');
const leadService = require('../leads/lead.service');

class FacebookWebhookController {
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === config.meta.verifyToken) {
        logger.info('Meta Webhook verified successfully');
        return res.status(200).send(challenge);
      } else {
        logger.warn('Meta Webhook verification failed: token mismatch');
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  }

  async handleWebhookEvent(req, res, next) {
    try {
      const body = req.body;

      if (body.object === 'page') {
        // Return HTTP 200 OK immediately per Meta requirements
        res.status(200).send('EVENT_RECEIVED');

        // Asynchronously process and deduplicate entries in background
        setImmediate(() => {
          this.processEntriesWithDeduplication(body.entry || []);
        });
      } else {
        res.sendStatus(404);
      }
    } catch (err) {
      logger.error('Error handling Facebook webhook POST event', err);
      if (!res.headersSent) {
        res.status(200).send('EVENT_RECEIVED');
      }
    }
  }

  async processEntriesWithDeduplication(entries) {
    for (const entry of entries) {
      const entryId = entry.id;
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // Deduplicate & Process feed changes
      for (const change of changes) {
        if (change.field === 'feed') {
          const value = change.value;
          if (value.item === 'comment' && value.verb === 'add') {
            const commentId = value.comment_id || `${entryId}_comment_${value.created_time}`;
            
            // Check & record in facebook_events table
            const isDuplicate = await this.recordFacebookEvent({
              eventId: commentId,
              eventType: 'feed_comment',
              objectId: value.post_id,
              payload: value
            });

            if (isDuplicate) {
              logger.info(`Skipping duplicate webhook comment event: ${commentId}`);
              continue;
            }

            try {
              await leadService.processFacebookCommentEvent({
                commentId,
                postId: value.post_id,
                message: value.message,
                userId: value.from?.id,
                userName: value.from?.name,
                createdTime: value.created_time
              });
              await this.updateEventStatus(commentId, 'processed');
            } catch (err) {
              logger.error(`Error processing webhook comment ${commentId}`, err);
              await this.updateEventStatus(commentId, 'failed', err.message);
            }
          }
        }
      }

      // Deduplicate & Process direct messaging
      for (const msg of messaging) {
        if (msg.message && msg.message.text) {
          const messageId = msg.message.mid || `${entryId}_msg_${msg.timestamp}`;

          const isDuplicate = await this.recordFacebookEvent({
            eventId: messageId,
            eventType: 'direct_message',
            objectId: msg.sender.id,
            payload: msg
          });

          if (isDuplicate) {
            logger.info(`Skipping duplicate webhook message event: ${messageId}`);
            continue;
          }

          try {
            await leadService.processFacebookMessageEvent({
              messageId,
              senderId: msg.sender.id,
              message: msg.message.text,
              timestamp: msg.timestamp
            });
            await this.updateEventStatus(messageId, 'processed');
          } catch (err) {
            logger.error(`Error processing webhook message ${messageId}`, err);
            await this.updateEventStatus(messageId, 'failed', err.message);
          }
        }
      }
    }
  }

  async recordFacebookEvent({ eventId, eventType, objectId, payload }) {
    try {
      const sql = `
        INSERT INTO facebook_events (event_id, event_type, object_id, payload, processing_status)
        VALUES ($1, $2, $3, $4, 'processing')
        ON CONFLICT (event_id) DO NOTHING
        RETURNING *
      `;
      const res = await query(sql, [eventId, eventType, objectId || null, JSON.stringify(payload)]);
      return res.rows.length === 0; // true if duplicate skipped
    } catch (err) {
      logger.error(`Failed recording event ${eventId}`, err);
      return false;
    }
  }

  async updateEventStatus(eventId, status, errorMessage = null) {
    try {
      const sql = `
        UPDATE facebook_events
        SET processing_status = $1, error_message = $2, processed_at = CURRENT_TIMESTAMP
        WHERE event_id = $3
      `;
      await query(sql, [status, errorMessage, eventId]);
    } catch (err) {
      logger.error(`Failed updating event status for ${eventId}`, err);
    }
  }

  async getCapabilities(req, res, next) {
    try {
      const capabilities = await facebookClient.checkCapabilities();
      return response.success(res, capabilities);
    } catch (err) {
      next(err);
    }
  }

  getStatus(req, res) {
    const facebookService = require('./facebook.service');
    const status = facebookService.getMetaConnectionStatus();
    return response.success(res, status);
  }

  async testConnection(req, res, next) {
    try {
      const facebookService = require('./facebook.service');
      const mockResult = await facebookService.publishPost({
        id: 'test-post-id',
        caption: 'Test post from Facebook Automation Backend',
        cta: 'Contact us!',
        hashtags: ['#test']
      }, { title: 'Test Asset' });
      return response.success(res, mockResult, 'Facebook connection test completed successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FacebookWebhookController();
