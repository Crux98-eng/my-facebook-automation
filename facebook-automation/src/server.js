const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./config/database');
const schedulerService = require('./modules/scheduler/scheduler.service');

const PORT = config.port || 5000;

async function startServer() {
  try {
    if (config.env !== 'test') {
      try {
        const client = await pool.connect();
        logger.info('Successfully connected to PostgreSQL database!');
        client.release();
      } catch (dbErr) {
        logger.warn(`PostgreSQL connection failed during startup: ${dbErr.message}. Ensure DATABASE_URL is valid.`);
      }
    }

    // Start background cron scheduler only if enabled for API process (default false in multi-cluster PM2 mode)
    if (config.env !== 'test' && process.env.ENABLE_SCHEDULER !== 'false') {
      schedulerService.init();
    } else {
      logger.info('Background scheduler is disabled for this API instance (run worker separately via npm run worker).');
    }

    const server = app.listen(PORT, () => {
      logger.info(`==================================================`);
      logger.info(`🚀 Facebook Automation Backend running on port ${PORT}`);
      // logger.info(`Environment: ${config.env}`);
      // logger.info(`Meta Graph API Version: ${config.meta.apiVersion}`);
      logger.info(`==================================================`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      schedulerService.stopAll();
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await pool.end();
          logger.info('PostgreSQL pool closed.');
        } catch (e) {
          logger.error('Error closing DB pool', e);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    logger.error('Fatal error during server startup', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
