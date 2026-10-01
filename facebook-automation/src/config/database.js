const { Pool } = require('pg');
const config = require('./env');
const logger = require('./logger');

let pool;

if (config.env === 'test') {
  // In test mode, allow mocking or light pool
  pool = new Pool({
    connectionString: config.db.url,
    max: 5,
    idleTimeoutMillis: 1000
  });
  // Prevent uncaught error crash during unit tests if DB connection isn't running
  pool.on('error', (err) => {
    logger.debug(`[DB Pool Error in test mode]: ${err.message}`);
  });
} else {
  pool = new Pool({
    connectionString: config.db.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle database client', err);
  });
}

const query = (text, params) => pool.query(text, params);

const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction
};
