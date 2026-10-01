const { query } = require('../../config/database');

class AssetRepository {
  async create(data) {
    const {
      storage_key,
      cdn_url,
      file_name,
      mime_type,
      file_size,
      category,
      title,
      description,
      tags = [],
      services = [],
      target_audience = []
    } = data;

    const sql = `
      INSERT INTO assets (
        storage_key, cdn_url, file_name, mime_type, file_size,
        category, title, description, tags, services, target_audience
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      storage_key,
      cdn_url,
      file_name || storage_key.split('/').pop(),
      mime_type || 'image/png',
      file_size || 0,
      category || 'other',
      title,
      description || null,
      JSON.stringify(tags),
      JSON.stringify(services),
      JSON.stringify(target_audience)
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  async findById(id) {
    const sql = `SELECT * FROM assets WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async findByStorageKey(storageKey) {
    const sql = `SELECT * FROM assets WHERE storage_key = $1`;
    const result = await query(sql, [storageKey]);
    return result.rows[0] || null;
  }

  async findAll(params = {}) {
    const { category, status, limit = 20, offset = 0 } = params;
    let whereConditions = [];
    let values = [];

    if (category) {
      values.push(category);
      whereConditions.push(`category = $${values.length}`);
    }

    if (status) {
      values.push(status);
      whereConditions.push(`status = $${values.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM assets ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0].count, 10);

    values.push(limit, offset);
    const sql = `
      SELECT * FROM assets
      ${whereClause}
      ORDER BY created_at DESC
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
      if (['tags', 'services', 'target_audience', 'ai_analysis'].includes(key)) {
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
      UPDATE assets
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async updateAnalysis(id, aiAnalysis) {
    const sql = `
      UPDATE assets
      SET ai_analysis = $1,
          ai_analysis_status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [JSON.stringify(aiAnalysis), id]);
    return result.rows[0] || null;
  }

  async incrementTimesPosted(id) {
    const sql = `
      UPDATE assets
      SET times_posted = times_posted + 1,
          last_posted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const sql = `DELETE FROM assets WHERE id = $1 RETURNING *`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async findEligibleForPost(cooldownHours = 168) {
    const sql = `
      SELECT a.* FROM assets a
      WHERE a.status = 'active'
        AND a.ai_analysis_status = 'completed'
        AND (a.last_posted_at IS NULL OR a.last_posted_at < NOW() - ($1 || ' hours')::INTERVAL)
        AND NOT EXISTS (
          SELECT 1 FROM generated_posts gp
          WHERE gp.asset_id = a.id
            AND gp.status IN ('draft', 'approved', 'scheduled', 'publishing')
        )
      ORDER BY a.times_posted ASC, a.last_posted_at ASC NULLS FIRST, a.created_at DESC
      LIMIT 10
    `;
    const result = await query(sql, [cooldownHours]);
    return result.rows;
  }
}

module.exports = new AssetRepository();
