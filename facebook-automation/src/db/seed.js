const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function runSeed() {
  const client = await pool.connect();
  try {
    logger.info('Starting database seeding...');

    // Seed default automation settings if not exist
    const settingsRes = await client.query('SELECT COUNT(*) FROM automation_settings');
    if (parseInt(settingsRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO automation_settings (
          posting_enabled, posts_per_day, posting_window_start, posting_window_end,
          auto_publish, auto_reply, lead_detection_enabled, lead_email_notifications_enabled, minimum_lead_score
        ) VALUES (true, 2, '09:00', '18:00', false, false, true, true, 60)
      `);
      logger.info('Seeded default automation_settings');
    }

    // Seed default admin user
    const usersRes = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersRes.rows[0].count, 10) === 0) {
      const passwordHash = await bcrypt.hash('AdminPass123!', 10);
      await client.query(`
        INSERT INTO users (email, password_hash, role, status)
        VALUES ('admin@example.com', $1, 'admin', 'active')
      `, [passwordHash]);
      logger.info('Seeded default admin user (admin@example.com / AdminPass123!)');
    }

    // Seed default content template
    const templateRes = await client.query('SELECT COUNT(*) FROM content_templates');
    if (parseInt(templateRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO content_templates (name, description, prompt, tone, cta, hashtag_strategy)
        VALUES (
          'Professional Showcase',
          'Standard template for showcasing design portfolio items',
          'Create a professional Facebook post caption for a design asset. Emphasize quality, client goals, and service availability.',
          'professional',
          'DM us or comment below to get a custom design quote for your brand!',
          'balanced'
        )
      `);
      logger.info('Seeded default content_template');
    }

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Failed to run database seed', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSeed };
