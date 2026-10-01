const { query } = require('../../config/database');

class SettingsRepository {
  async getSettings() {
    const sql = `SELECT * FROM automation_settings ORDER BY created_at ASC LIMIT 1`;
    const result = await query(sql);
    if (result.rows.length === 0) {
      // Default fallback
      const insertSql = `
        INSERT INTO automation_settings (
          posting_enabled, posts_per_day, posting_window_start, posting_window_end,
          auto_publish, auto_reply, lead_detection_enabled, lead_email_notifications_enabled, minimum_lead_score
        ) VALUES (true, 2, '09:00', '18:00', false, false, true, true, 60)
        RETURNING *
      `;
      const inserted = await query(insertSql);
      return inserted.rows[0];
    }
    return result.rows[0];
  }

  async updateSettings(data) {
    const current = await this.getSettings();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(current.id);

    const sql = `
      UPDATE automation_settings
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }
}

module.exports = new SettingsRepository();
