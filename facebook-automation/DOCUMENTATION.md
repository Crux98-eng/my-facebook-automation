# Facebook Automation Backend — Master Documentation

Production-ready Node.js/Express.js/PostgreSQL backend for an automated Facebook marketing and lead-generation platform.

---

## TABLE OF CONTENTS
1. [System Overview & Quick Start](#1-system-overview--quick-start)
2. [Core Architecture & Database Schema](#2-core-architecture--database-schema)
3. [Complete API Endpoints Reference](#3-complete-api-endpoints-reference)
4. [Meta / Facebook Graph API & Webhook Setup](#4-meta--facebook-graph-api--webhook-setup)
5. [Cloudflare R2 Integration & Auto-Sync Guide](#5-cloudflare-r2-integration--auto-sync-guide)
6. [AI Provider Abstraction & Lead Classifier](#6-ai-provider-abstraction--lead-classifier)
7. [Production Deployment & Worker Guide](#7-production-deployment--worker-guide)

---

## 1. SYSTEM OVERVIEW & QUICK START

The backend platform indexes creative design work stored in Cloudflare R2, auto-synchronizes new bucket items, analyzes visual assets with AI vision models, generates targeted post copy, publishes posts to Facebook via Meta Graph API, monitors engagement, classifies potential buyer leads using AI intent detection, records conversation history, and sends email notifications via Resend.

### Tech Stack
* **Runtime & Framework**: Node.js (CommonJS), Express.js
* **Database**: PostgreSQL (`pg` driver with parameterized queries & transactions)
* **Object Storage**: Cloudflare R2 (`@aws-sdk/client-s3`)
* **AI Engine**: OpenRouter API (OpenAI-compatible Vision & Text Completions)
* **Social Media API**: Meta Graph API (v19.0)
* **Email Service**: Resend
* **Scheduler**: `node-cron`
* **Security & Utility**: Helmet, CORS, Express-Rate-Limit, Joi, Winston, Jest, Supertest

### Quick Start
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```
3. **Run PostgreSQL Database Migrations & Seeds**:
   ```bash
   npm run migrate
   npm run seed
   ```
4. **Start Development Server**:
   ```bash
   npm run dev
   ```
5. **Run Background Worker Separately**:
   ```bash
   node src/worker.js
   ```
6. **Run Test Suite**:
   ```bash
   npm test
   ```

---

## 2. CORE ARCHITECTURE & DATABASE SCHEMA

### Core Business Flow

```text
MY CREATIVE WORK
      ↓
Cloudflare R2 Storage
      ↓
R2 Bucket Auto-Sync (POST /api/v1/assets/sync)
      ↓
Public CDN URL Validation
      ↓
Backend Asset Catalog (POST /api/v1/assets)
      ↓
Asset Selection Strategy (asset-selection.service.js)
      ↓
AI Vision Analysis (POST /api/v1/assets/:id/analyze)
      ↓
Content Generation (POST /api/v1/content/generate)
      ↓
Validation & Cooldown Checks (ASSET_POST_COOLDOWN_HOURS)
      ↓
Meta Graph API (Facebook Post Publish)
      ↓
Meta Webhook & Event Deduplication (facebook_events table)
      ↓
Facebook Engagement (Comments & Direct Messages)
      ↓
AI Intent Detection & Lead Scoring (0 - 100)
      ↓
Conversation & Message Persistence (conversations & messages tables)
      ↓
PostgreSQL Lead Database
      ↓
Resend Email Notification (MIN_LEAD_SCORE)
```

### Modular Code Architecture
The code follows a clean **Controller-Service-Repository** pattern:
* `src/modules/*/*.routes.js`: Defines HTTP endpoints, rate limits, and Joi middleware schemas.
* `src/modules/*/*.controller.js`: Handles HTTP requests/responses using standard JSON wrappers (`{ success: true, data: ... }`).
* `src/modules/*/*.service.js`: Contains business logic, AI orchestration, Meta API client calls, and notification dispatching.
* `src/modules/*/*.repository.js`: Direct database access using parameterized SQL queries and PostgreSQL transactions (`withTransaction`).

### Database Relational Schema
* `users`: Admin authentication (`email`, `password_hash`, `role`).
* `assets`: Catalog of creative work (`storage_key`, `cdn_url`, `category`, `ai_analysis`, `times_posted`, `last_posted_at`, `analysis_version`, `analyzed_at`).
* `content_templates`: Prompts, tone strategies, and default CTAs.
* `generated_posts`: Captions, hashtags, CTA, status (`draft`, `scheduled`, `publishing`, `published`, `failed`), `facebook_post_id`, `published_at`.
* `facebook_accounts`: Page IDs and encrypted access tokens.
* `facebook_events`: Webhook event deduplication table (`event_id UNIQUE`, `processing_status`, `payload`).
* `facebook_engagement`: Facebook comments, messages, reactions (`facebook_object_id` constraint).
* `conversations`: Active user chat conversations (`facebook_user_id`, `channel`, `lead_id`, `status`).
* `messages`: Multi-turn chat messages (`conversation_id`, `facebook_message_id`, `direction`, `message`).
* `leads`: Buyer leads (`facebook_user_id`, `intent`, `lead_score`, `service_interest`, `email`, `phone`, `status`, `notified_at`).
* `lead_events`: Comprehensive audit log of lead updates and classification events.
* `automation_settings`: Global settings (`posting_enabled`, `posts_per_day`, `auto_publish`, `minimum_lead_score`).

---

## 3. COMPLETE API ENDPOINTS REFERENCE

Base URL Path: `/api/v1`

### Assets Endpoints
* **`POST /api/v1/assets/sync`**: Auto-synchronize missing supported images from R2 bucket into catalog.
* **`POST /api/v1/assets`**: Register a new R2 asset in catalog.
  * *Request*: `{ "storageKey": "logos/logo-001.png", "category": "logo_design", "title": "Restaurant Logo" }`
* **`GET /api/v1/assets`**: List assets with pagination (`page`, `limit`, `category`, `status`).
* **`GET /api/v1/assets/:id`**: Retrieve single asset by UUID.
* **`PATCH /api/v1/assets/:id`**: Update asset details.
* **`DELETE /api/v1/assets/:id`**: Delete asset from catalog.
* **`POST /api/v1/assets/:id/analyze`**: Trigger AI vision model to analyze CDN image and save structured analysis.

### Content Generation Endpoints
* **`POST /api/v1/content/generate`**: Generate Facebook post copy.
  * *Request*: `{ "assetId": "uuid", "contentStyle": "professional", "objective": "generate_leads" }`

### Posts & Publishing Endpoints
* **`GET /api/v1/posts`**: List generated posts (`status`, `assetId`, `page`, `limit`).
* **`GET /api/v1/posts/:id`**: Retrieve post details.
* **`POST /api/v1/posts`**: Create custom post draft.
* **`POST /api/v1/posts/:id/publish`** or **`POST /api/v1/posts/publish`**: Instantly publish post to Facebook via Graph API.
* **`POST /api/v1/posts/:id/schedule`**: Schedule post for publication (`{ "scheduledAt": "ISO-date" }`).
* **`POST /api/v1/posts/:id/cancel`**: Cancel scheduled post.

### Facebook Webhooks & Capabilities Endpoints
* **`GET /api/v1/facebook/capabilities`**: Test token validity, permissions, and report feature capabilities (`connected`, `publishing`, `comments`, `messaging`, `insights`).
* **`GET /api/v1/facebook/webhook`**: Meta Webhook Verification (`hub.verify_token` & `hub.challenge`).
* **`POST /api/v1/facebook/webhook`**: Meta Webhook Event Receiver (Persists to `facebook_events` for deduplication and processes asynchronously).
* **`GET /api/v1/facebook/status`**: Check Facebook page connection status.
* **`POST /api/v1/facebook/test`**: Test Graph API posting functionality.

### Leads Endpoints
* **`GET /api/v1/leads`**: List leads (`status`, `intent`, `minScore`, `page`, `limit`).
* **`GET /api/v1/leads/:id`**: Retrieve lead details and event audit history.
* **`PATCH /api/v1/leads/:id`**: Update lead status (`new`, `contacted`, `qualified`, `converted`, `not_interested`, `spam`, `archived`).

### Automation & Dashboard Endpoints
* **`GET /api/v1/dashboard/summary`**: Aggregate metrics for dashboard.
* **`GET /api/v1/automation/status`**: Fetch current automation settings.
* **`PATCH /api/v1/automation/settings`**: Update settings (`posting_enabled`, `auto_publish`, `minimum_lead_score`).
* **`POST /api/v1/automation/run`**: Trigger an immediate manual automation cycle and return execution report (`assetSelected`, `contentGenerated`, `published`, `reason`).

### Health Check
* **`GET /health`**: Server & component health check (`status`, `database`, `r2`, `ai`, `facebook`, `email`, `worker`).

---

## 4. META / FACEBOOK GRAPH API & WEBHOOK SETUP

### 1. Create a Meta Developer App
1. Go to [Meta for Developers Portal](https://developers.facebook.com/).
2. Create an App of type **Business**.
3. Copy **App ID** and **App Secret** into `.env`.

### 2. Permissions & Page Token
1. Grant the following Page Permissions:
   * `pages_read_engagement`
   * `pages_manage_posts`
   * `pages_messaging`
   * `read_insights`
2. Obtain a **Never-Expiring Page Access Token**.
3. Configure `.env`:
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   META_PAGE_ID=your_facebook_page_id
   META_PAGE_ACCESS_TOKEN=your_page_access_token
   META_VERIFY_TOKEN=your_custom_webhook_verify_token
   META_GRAPH_API_VERSION=v19.0
   ```

### 3. Webhook Registration
1. In Meta Developer Portal, go to **Webhooks** → **Page**.
2. Callback URL: `https://your-domain.com/api/v1/facebook/webhook`
3. Verify Token: `META_VERIFY_TOKEN` (matches `.env`).
4. Subscribe to events: `feed`, `messages`.

---

## 5. CLOUDFLARE R2 INTEGRATION & AUTO-SYNC GUIDE

### 1. Bucket & Public CDN Setup
1. Log into Cloudflare Dashboard → **R2 Object Storage**.
2. Create a bucket (e.g. `facebook-automation-assets`).
3. Enable Public Access or attach a Custom Domain (`https://cdn.yourdomain.com`).

### 2. API Credentials
1. Under **Manage R2 API Tokens**, create a token with Object Read & Write permissions.
2. Configure `.env`:
   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   R2_BUCKET_NAME=facebook-automation-assets
   R2_PUBLIC_BASE_URL=https://cdn.yourdomain.com
   ```

### 3. Auto-Synchronizing R2 Assets
To automatically discover and register unsynced image assets uploaded directly to Cloudflare R2:
```http
POST /api/v1/assets/sync
Authorization: Bearer YOUR_JWT_TOKEN
```
Response:
```json
{
  "success": true,
  "data": {
    "scanned": 25,
    "newAssets": 5,
    "existingAssets": 19,
    "skipped": 1
  }
}
```

---

## 6. AI PROVIDER ABSTRACTION & LEAD CLASSIFIER

### Abstraction Services
* `vision.service.js`: Analyzes image CDN URLs using OpenRouter vision models.
* `content.service.js`: Generates Facebook post captions, CTAs, and hashtags.
* `lead-classifier.service.js`: Classifies comments and messages for buyer intent.

Configuration (`.env`):
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=openai/gpt-4o-mini
AI_VISION_MODEL=openai/gpt-4o-mini
AI_BASE_URL=https://openrouter.ai/api/v1
```

### Lead Intent Scoring System
* `pricing_inquiry`: User asks about prices/rates (Base Score: 60-75)
* `explicit_service_need`: User asks to hire/order (Base Score: 80-95)
* `purchase_intent`: User asks how to buy or provides contact details (Base Score: 80-100)
* Phone/Email provided: +15 bonus points
* `general_engagement`: Compliments ("Nice design!", 🔥) (Base Score: 5-15)
* `spam`: Link drops or scam bots (Score: 0)

When `lead_score >= MIN_LEAD_SCORE` (default 60), Resend sends an email notification to `LEAD_NOTIFICATION_EMAIL`.

---

## 7. PRODUCTION DEPLOYMENT & WORKER GUIDE

To avoid duplicate cron job execution across PM2 cluster workers, isolate the API process and background worker:

### PM2 Process Architecture

```text
              ┌───────────────┐
              │ Reverse Proxy │
              └───────┬───────┘
                      ↓
             ┌────────────────┐
             │ Express API    │ (ENABLE_SCHEDULER=false)
             └───────┬────────┘
                     ↓
               PostgreSQL
                     ↑
                     │
             ┌───────┴────────┐
             │ Standalone     │ (node src/worker.js)
             │ Worker         │
             └────────────────┘
```

### PM2 Ecosystem File (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: "facebook-api",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        ENABLE_SCHEDULER: "false"
      }
    },
    {
      name: "facebook-worker",
      script: "src/worker.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```
