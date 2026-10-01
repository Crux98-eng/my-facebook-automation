const { query, withTransaction } = require('../../config/database');

class LeadRepository {
  async findByFacebookUserAndSource(facebookUserId, source = 'facebook_comment') {
    const sql = `
      SELECT * FROM leads
      WHERE facebook_user_id = $1 AND source = $2
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const result = await query(sql, [facebookUserId, source]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const sql = `
      SELECT l.*,
        a.title as asset_title, a.cdn_url as asset_cdn_url,
        gp.facebook_permalink
      FROM leads l
      LEFT JOIN assets a ON l.asset_id = a.id
      LEFT JOIN generated_posts gp ON l.generated_post_id = gp.id
      WHERE l.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async findAll(params = {}) {
    const { status, intent, minScore, limit = 20, offset = 0 } = params;
    let whereConditions = [];
    let values = [];

    if (status) {
      values.push(status);
      whereConditions.push(`l.status = $${values.length}`);
    }

    if (intent) {
      values.push(intent);
      whereConditions.push(`l.intent = $${values.length}`);
    }

    if (minScore !== undefined && minScore !== null) {
      values.push(minScore);
      whereConditions.push(`l.lead_score >= $${values.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM leads l ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0].count, 10);

    values.push(limit, offset);
    const sql = `
      SELECT l.*,
        a.title as asset_title, a.cdn_url as asset_cdn_url,
        gp.facebook_permalink
      FROM leads l
      LEFT JOIN assets a ON l.asset_id = a.id
      LEFT JOIN generated_posts gp ON l.generated_post_id = gp.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await query(sql, values);
    return { items: result.rows, total };
  }

  async upsertLead(leadData) {
    return await withTransaction(async (client) => {
      const {
        facebook_user_id,
        facebook_user_name,
        facebook_profile_url,
        email,
        phone,
        source = 'facebook_comment',
        generated_post_id,
        asset_id,
        intent,
        lead_score,
        service_interest,
        message,
        business_name,
        location,
        budget,
        status = 'new',
        ai_analysis = {}
      } = leadData;

      let lead;

      if (facebook_user_id) {
        const checkSql = `SELECT * FROM leads WHERE facebook_user_id = $1 AND source = $2 LIMIT 1`;
        const checkRes = await client.query(checkSql, [facebook_user_id, source]);
        lead = checkRes.rows[0];
      }

      if (lead) {
        // Update existing lead
        const updateSql = `
          UPDATE leads
          SET facebook_user_name = COALESCE($1, facebook_user_name),
              email = COALESCE($2, email),
              phone = COALESCE($3, phone),
              intent = $4,
              lead_score = GREATEST(lead_score, $5),
              service_interest = COALESCE($6, service_interest),
              message = $7,
              business_name = COALESCE($8, business_name),
              location = COALESCE($9, location),
              budget = COALESCE($10, budget),
              ai_analysis = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
          RETURNING *
        `;
        const updateRes = await client.query(updateSql, [
          facebook_user_name,
          email,
          phone,
          intent,
          lead_score,
          service_interest,
          message,
          business_name,
          location,
          budget,
          JSON.stringify(ai_analysis),
          lead.id
        ]);
        lead = updateRes.rows[0];
      } else {
        // Create new lead
        const insertSql = `
          INSERT INTO leads (
            facebook_user_id, facebook_user_name, facebook_profile_url,
            email, phone, source, generated_post_id, asset_id,
            intent, lead_score, service_interest, message,
            business_name, location, budget, status, ai_analysis
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `;
        const insertRes = await client.query(insertSql, [
          facebook_user_id || null,
          facebook_user_name || 'Anonymous User',
          facebook_profile_url || (facebook_user_id ? `https://facebook.com/${facebook_user_id}` : null),
          email || null,
          phone || null,
          source,
          generated_post_id || null,
          asset_id || null,
          intent,
          lead_score,
          service_interest || null,
          message,
          business_name || null,
          location || null,
          budget || null,
          status,
          JSON.stringify(ai_analysis)
        ]);
        lead = insertRes.rows[0];
      }

      // Record lead audit event
      const eventSql = `
        INSERT INTO lead_events (lead_id, event_type, message, metadata)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(eventSql, [
        lead.id,
        'interaction_classified',
        `Lead classified with intent '${intent}' and score ${lead_score}`,
        JSON.stringify({ message, ai_analysis })
      ]);

      return lead;
    });
  }

  async updateStatus(id, status) {
    return await withTransaction(async (client) => {
      const sql = `
        UPDATE leads
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const res = await client.query(sql, [status, id]);
      const updatedLead = res.rows[0];

      if (updatedLead) {
        await client.query(`
          INSERT INTO lead_events (lead_id, event_type, message, metadata)
          VALUES ($1, 'status_updated', $2, $3)
        `, [id, `Status updated to ${status}`, JSON.stringify({ status })]);
      }

      return updatedLead;
    });
  }

  async markNotified(id) {
    const sql = `
      UPDATE leads
      SET notified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  }
}

module.exports = new LeadRepository();
