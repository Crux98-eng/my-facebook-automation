const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function runMigrations() {
  const client = await pool.connect();
  try {
    logger.info('Starting database migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      logger.info(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }

    logger.info('All database migrations completed successfully!');
  } catch (error) {
    logger.error('Failed to run database migrations', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
