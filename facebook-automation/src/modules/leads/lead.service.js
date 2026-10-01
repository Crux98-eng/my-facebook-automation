const leadRepository = require('./lead.repository');
const aiService = require('../ai/ai.service');
const engagementService = require('../engagement/engagement.service');
const notificationService = require('../notifications/notification.service');
const postRepository = require('../posts/post.repository');
const config = require('../../config/env');
const logger = require('../../config/logger');
const { NotFoundError } = require('../../utils/errors');
const { query } = require('../../config/database');

class LeadService {
  async processFacebookCommentEvent(event) {
    const { commentId, postId, message, userId, userName } = event;

    // Idempotency check: track engagement
    await engagementService.trackEngagement({
      facebook_object_id: commentId,
      engagement_type: 'comment',
      facebook_user_id: userId,
      facebook_user_name: userName,
      message
    });

    if (!message) return null;

    // Load related post context
    let postContext = {};
    let generatedPost = null;
    if (postId) {
      const postsRes = await postRepository.findAll({ limit: 1 });
      if (postsRes.items.length > 0) {
        generatedPost = postsRes.items[0];
        postContext = {
          service: generatedPost.asset_category || 'design',
          assetId: generatedPost.asset_id
        };
      }
    }

    // AI Classification
    const classification = await aiService.classifyLead(message, postContext);
    logger.info(`Lead classification result for comment ${commentId}: isPotentialLead=${classification.isPotentialLead}, score=${classification.leadScore}`);

    if (classification.isPotentialLead || classification.leadScore >= 30) {
      const lead = await leadRepository.upsertLead({
        facebook_user_id: userId,
        facebook_user_name: userName,
        source: 'facebook_comment',
        generated_post_id: generatedPost ? generatedPost.id : null,
        asset_id: generatedPost ? generatedPost.asset_id : null,
        intent: classification.intent,
        lead_score: classification.leadScore,
        service_interest: classification.serviceInterest,
        message,
        business_name: classification.businessName,
        location: classification.location,
        budget: classification.budget,
        email: classification.extractedEmail,
        phone: classification.extractedPhone,
        ai_analysis: classification
      });

      // Record Conversation & Message History
      await this.recordConversationAndMessage({
        facebookUserId: userId,
        channel: 'facebook_comment',
        leadId: lead ? lead.id : null,
        facebookMessageId: commentId,
        direction: 'inbound',
        message
      });

      // Trigger Email notification if high score & notifications enabled & not previously notified
      if (lead && lead.lead_score >= config.automation.minLeadScore && !lead.notified_at) {
        try {
          await notificationService.notifyNewLead(lead);
          await leadRepository.markNotified(lead.id);
        } catch (emailErr) {
          logger.error(`Failed to send email notification for lead ${lead.id}`, emailErr);
        }
      }

      return lead;
    }

    return null;
  }

  async processFacebookMessageEvent(event) {
    const { messageId, senderId, message } = event;

    await engagementService.trackEngagement({
      facebook_object_id: messageId,
      engagement_type: 'message',
      facebook_user_id: senderId,
      message
    });

    const classification = await aiService.classifyLead(message, { source: 'facebook_dm' });

    if (classification.isPotentialLead || classification.leadScore >= 30) {
      const lead = await leadRepository.upsertLead({
        facebook_user_id: senderId,
        source: 'facebook_dm',
        intent: classification.intent,
        lead_score: classification.leadScore,
        service_interest: classification.serviceInterest,
        message,
        business_name: classification.businessName,
        location: classification.location,
        budget: classification.budget,
        email: classification.extractedEmail,
        phone: classification.extractedPhone,
        ai_analysis: classification
      });

      await this.recordConversationAndMessage({
        facebookUserId: senderId,
        channel: 'facebook_dm',
        leadId: lead ? lead.id : null,
        facebookMessageId: messageId,
        direction: 'inbound',
        message
      });

      if (lead && lead.lead_score >= config.automation.minLeadScore && !lead.notified_at) {
        try {
          await notificationService.notifyNewLead(lead);
          await leadRepository.markNotified(lead.id);
        } catch (emailErr) {
          logger.error(`Failed to send email notification for lead ${lead.id}`, emailErr);
        }
      }

      return lead;
    }

    return null;
  }

  async recordConversationAndMessage({ facebookUserId, channel, leadId, facebookMessageId, direction, message }) {
    try {
      let convSql = `SELECT * FROM conversations WHERE facebook_user_id = $1 AND channel = $2 LIMIT 1`;
      let convRes = await query(convSql, [facebookUserId, channel]);
      let conversation = convRes?.rows?.[0];

      if (!conversation) {
        const insertConv = `
          INSERT INTO conversations (facebook_user_id, channel, lead_id, status)
          VALUES ($1, $2, $3, 'active')
          RETURNING *
        `;
        const inserted = await query(insertConv, [facebookUserId, channel, leadId]);
        conversation = inserted?.rows?.[0] || { id: 'conv-mock-id' };
      }

      const insertMsg = `
        INSERT INTO messages (conversation_id, facebook_message_id, direction, message)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (facebook_message_id) DO NOTHING
      `;
      await query(insertMsg, [conversation.id, facebookMessageId, direction, message]);
    } catch (err) {
      logger.error(`Failed recording conversation message for user ${facebookUserId}`, err);
    }
  }

  async getLeadById(id) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  async listLeads(query) {
    return await leadRepository.findAll(query);
  }

  async updateLeadStatus(id, status) {
    await this.getLeadById(id);
    return await leadRepository.updateStatus(id, status);
  }
}

module.exports = new LeadService();
