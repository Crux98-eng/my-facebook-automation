# Production Deployment Guide

## 1. Environment Preparation

Set environment variables in production:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://user:password@pg-host:5432/facebook_automation
JWT_SECRET=production_strong_secret_key_min_32_chars
AUTO_PUBLISH=false
```

## 2. PostgreSQL Database Setup

Run database migrations and seed default configuration:
```bash
npm run migrate
npm run seed
```

## 3. Process Management with PM2

Install PM2 globally and start app:
```bash
npm install -g pm2
pm2 start src/server.js --name "facebook-automation-backend" -i max
pm2 save
```

## 4. Health Check Monitoring

Monitor the `/health` endpoint:
```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-25T10:00:00.000Z",
  "uptime": 3600,
  "service": "facebook-automation-backend"
}
```
