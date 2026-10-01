const schedulerService = require('./modules/scheduler/scheduler.service');
const config = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./config/database');

async function startWorker() {
  logger.info('==================================================');
  logger.info('⚙️ Starting Facebook Automation Standalone Worker');
  logger.info(`Environment: ${config.env}`);
  logger.info('==================================================');

  try {
    const client = await pool.connect();
    logger.info('Worker connected to PostgreSQL database successfully');
    client.release();
  } catch (err) {
    logger.warn(`Worker DB Connection Warning: ${err.message}`);
  }

  schedulerService.init();

  const shutdown = async (signal) => {
    logger.info(`Worker received ${signal}. Stopping scheduler jobs...`);
    schedulerService.stopAll();
    try {
      await pool.end();
      logger.info('Worker database pool closed.');
    } catch (e) {
      logger.error('Error shutting down worker pool', e);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startWorker();
}

module.exports = { startWorker };
