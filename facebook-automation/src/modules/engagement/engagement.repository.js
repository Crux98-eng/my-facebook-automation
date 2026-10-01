const { query } = require('../../config/database');

class EngagementRepository {
  async recordEngagement(data) {
    const {
      generated_post_id,
      facebook_object_id,
      engagement_type,
      facebook_user_id,
      facebook_user_name,
      message,
      metadata = {}
    } = data;

    const sql = `
      INSERT INTO facebook_engagement (
        generated_post_id, facebook_object_id, engagement_type,
        facebook_user_id, facebook_user_name, message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (facebook_object_id) DO NOTHING
      RETURNING *
    `;

    const values = [
      generated_post_id || null,
      facebook_object_id,
      engagement_type,
      facebook_user_id || null,
      facebook_user_name || null,
      message || null,
      JSON.stringify(metadata)
    ];

    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async findByFacebookObjectId(objectId) {
    const sql = `SELECT * FROM facebook_engagement WHERE facebook_object_id = $1`;
    const result = await query(sql, [objectId]);
    return result.rows[0] || null;
  }
}

module.exports = new EngagementRepository();
