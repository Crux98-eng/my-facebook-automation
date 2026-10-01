const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestIdMiddleware = require('./middleware/request-id');
const errorHandler = require('./middleware/error-handler');
const { apiLimiter } = require('./middleware/rate-limit');
const config = require('./config/env');
const { pool } = require('./config/database');
const postController = require('./modules/posts/post.controller');

// Module Routes
const assetRoutes = require('./modules/assets/asset.routes');
const postRoutes = require('./modules/posts/post.routes');
const facebookRoutes = require('./modules/facebook/facebook.routes');
const leadRoutes = require('./modules/leads/lead.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const app = express();

// Core Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Enhanced Granular Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    if (config.env !== 'test') {
      const client = await pool.connect();
      client.release();
    }
  } catch (e) {
    dbStatus = 'degraded';
  }

  const r2Status = (config.r2.accountId && config.r2.accessKeyId) ? 'ok' : 'mock';
  const aiStatus = (config.ai.apiKey && config.ai.apiKey !== 'mock_ai_key') ? 'configured' : 'mock';
  const facebookStatus = (config.meta.pageId && config.meta.accessToken) ? 'connected' : 'mock';
  const emailStatus = (config.resend.apiKey && config.resend.apiKey !== 're_mock_key') ? 'configured' : 'mock';
  const workerStatus = process.env.ENABLE_SCHEDULER !== 'false' ? 'running' : 'standalone';

  res.status(200).json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'facebook-automation-backend',
    services: {
      database: dbStatus,
      r2: r2Status,
      ai: aiStatus,
      facebook: facebookStatus,
      email: emailStatus,
      worker: workerStatus
    }
  });
});

// API Routes
const apiPrefix = '/api/v1';

app.use(`${apiPrefix}/assets`, apiLimiter, assetRoutes);
app.post(`${apiPrefix}/content/generate`, apiLimiter, (req, res, next) => postController.generate(req, res, next));
app.use(`${apiPrefix}/posts`, apiLimiter, postRoutes);
app.use(`${apiPrefix}/facebook`, facebookRoutes);
app.use(`${apiPrefix}/leads`, apiLimiter, leadRoutes);
app.use(`${apiPrefix}/automation`, apiLimiter, settingsRoutes);
app.use(`${apiPrefix}/dashboard`, apiLimiter, dashboardRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND_ERROR',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
