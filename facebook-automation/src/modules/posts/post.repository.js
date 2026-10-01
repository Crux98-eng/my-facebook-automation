const { query, withTransaction } = require('../../config/database');

class PostRepository {
  async create(data) {
    const {
      asset_id,
      template_id,
      caption,
      hashtags = [],
      cta,
      target_audience = [],
      ai_metadata = {},
      status = 'draft',
      scheduled_at = null
    } = data;

    const sql = `
      INSERT INTO generated_posts (
        asset_id, template_id, caption, hashtags, cta,
        target_audience, ai_metadata, status, scheduled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      asset_id,
      template_id || null,
      caption,
      JSON.stringify(hashtags),
      cta || null,
      JSON.stringify(target_audience),
      JSON.stringify(ai_metadata),
      status,
      scheduled_at
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  async findById(id) {
    const sql = `
      SELECT gp.*, a.title as asset_title, a.cdn_url as asset_cdn_url, a.category as asset_category
      FROM generated_posts gp
      LEFT JOIN assets a ON gp.asset_id = a.id
      WHERE gp.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async findAll(params = {}) {
    const { status, asset_id, limit = 20, offset = 0 } = params;
    let whereConditions = [];
    let values = [];

    if (status) {
      values.push(status);
      whereConditions.push(`gp.status = $${values.length}`);
    }

    if (asset_id) {
      values.push(asset_id);
      whereConditions.push(`gp.asset_id = $${values.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM generated_posts gp ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0].count, 10);

    values.push(limit, offset);
    const sql = `
      SELECT gp.*, a.title as asset_title, a.cdn_url as asset_cdn_url, a.category as asset_category
      FROM generated_posts gp
      LEFT JOIN assets a ON gp.asset_id = a.id
      ${whereClause}
      ORDER BY gp.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await query(sql, values);
    return { items: result.rows, total };
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (['hashtags', 'target_audience', 'ai_metadata'].includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE generated_posts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async markPublished(id, facebookPostId, facebookPermalink) {
    return await withTransaction(async (client) => {
      const updatePostSql = `
        UPDATE generated_posts
        SET status = 'published',
            facebook_post_id = $1,
            facebook_permalink = $2,
            published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      const postRes = await client.query(updatePostSql, [facebookPostId, facebookPermalink, id]);
      const updatedPost = postRes.rows[0];

      if (updatedPost && updatedPost.asset_id) {
        const updateAssetSql = `
          UPDATE assets
          SET times_posted = times_posted + 1,
              last_posted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        await client.query(updateAssetSql, [updatedPost.asset_id]);
      }

      return updatedPost;
    });
  }

  async markFailed(id, errorMessage) {
    const sql = `
      UPDATE generated_posts
      SET status = 'failed',
          error_message = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [errorMessage, id]);
    return result.rows[0] || null;
  }

  async findDueScheduledPosts() {
    const sql = `
      SELECT gp.*, a.title as asset_title, a.cdn_url as asset_cdn_url, a.category as asset_category
      FROM generated_posts gp
      LEFT JOIN assets a ON gp.asset_id = a.id
      WHERE gp.status = 'scheduled'
        AND gp.scheduled_at <= NOW()
      ORDER BY gp.scheduled_at ASC
      LIMIT 10
    `;
    const result = await query(sql);
    return result.rows;
  }

  async checkRecentlyPostedAsset(assetId, cooldownHours = 168) {
    const sql = `
      SELECT 1 FROM generated_posts
      WHERE asset_id = $1
        AND status IN ('published', 'publishing', 'scheduled')
        AND (published_at >= NOW() - ($2 || ' hours')::INTERVAL OR created_at >= NOW() - ($2 || ' hours')::INTERVAL)
      LIMIT 1
    `;
    const result = await query(sql, [assetId, cooldownHours]);
    return result.rows.length > 0;
  }
}

module.exports = new PostRepository();
