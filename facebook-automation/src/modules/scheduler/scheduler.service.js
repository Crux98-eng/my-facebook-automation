const cron = require('node-cron');
const contentGenerationJob = require('./jobs/content-generation.job');
const publishingJob = require('./jobs/publishing.job');
const engagementJob = require('./jobs/engagement.job');
const leadProcessingJob = require('./jobs/lead-processing.job');
const logger = require('../../config/logger');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    logger.info('Initializing Cron Scheduler background jobs...');

    // 1. Publishing Job: Check every 5 minutes for due scheduled posts
    const pubCron = cron.schedule('*/5 * * * *', async () => {
      try {
        await publishingJob.execute();
      } catch (err) {
        logger.error('[Scheduler Cron] Error running publishing job', err);
      }
    });

    // 2. Content Generation Job: Run every 6 hours to analyze & prepare posts
    const genCron = cron.schedule('0 */6 * * *', async () => {
      try {
        await contentGenerationJob.execute();
      } catch (err) {
        logger.error('[Scheduler Cron] Error running content generation job', err);
      }
    });

    // 3. Engagement Polling Job: Run every 15 minutes
    const engCron = cron.schedule('*/15 * * * *', async () => {
      try {
        await engagementJob.execute();
      } catch (err) {
        logger.error('[Scheduler Cron] Error running engagement job', err);
      }
    });

    // 4. Lead Processing Queue Job: Run every 10 minutes
    const leadCron = cron.schedule('*/10 * * * *', async () => {
      try {
        await leadProcessingJob.execute();
      } catch (err) {
        logger.error('[Scheduler Cron] Error running lead processing job', err);
      }
    });

    this.jobs.push(pubCron, genCron, engCron, leadCron);
    this.isInitialized = true;
    logger.info('Scheduler Service initialized successfully with 4 cron tasks.');
  }

  stopAll() {
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
    this.isInitialized = false;
    logger.info('Stopped all background scheduler jobs.');
  }
}

module.exports = new SchedulerService();
