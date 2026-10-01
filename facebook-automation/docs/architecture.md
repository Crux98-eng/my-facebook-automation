# Architecture & Core Business Flow

## 1. System Overview

The system automates visual design marketing on Facebook through an asset-first catalog flow:

```text
MY CREATIVE WORK
      ↓
Cloudflare R2 Storage
      ↓
Public CDN URL
      ↓
Backend Asset Catalog
      ↓
AI Vision Analysis (Structured JSON)
      ↓
Content Generation (Captions, Hashtags, CTA)
      ↓
Validation & Cooldown Checks
      ↓
Meta Graph API (Facebook Post)
      ↓
Facebook Engagement (Comments & DMs)
      ↓
AI Intent Detection & Lead Scoring
      ↓
PostgreSQL Lead Database
      ↓
Resend Email Notification
```

## 2. Layered Architecture

The application follows the **Controller-Service-Repository** pattern:

* **Routes (`src/modules/*/*.routes.js`)**: Map HTTP endpoints, attach auth/rate-limiting middleware, and validate request schemas using Joi.
* **Controllers (`src/modules/*/*.controller.js`)**: Thin HTTP handlers that decode inputs, invoke services, and return standardized JSON responses (`{ success: true, data: ... }`).
* **Services (`src/modules/*/*.service.js`)**: Pure business logic, idempotency checks, AI provider orchestration, Meta Graph API calls, and email dispatching.
* **Repositories (`src/modules/*/*.repository.js`)**: SQL queries against PostgreSQL using standard parameterized queries and database transactions.

## 3. Database Schema Overview

* **`users`**: Administrator credentials and roles.
* **`assets`**: Catalog of design files with CDN URLs, categories, and AI vision analysis JSON metadata.
* **`content_templates`**: Prompts, tones, and strategies for content generation.
* **`generated_posts`**: Captions, CTAs, scheduled times, and Facebook publication metadata.
* **`facebook_accounts`**: Page credentials and tokens (encrypted).
* **`facebook_engagement`**: Likes, comments, reactions, and messages (unique Facebook object IDs).
* **`leads`**: Identified buyer leads, scores (0-100), intent, extracted contact details, and current funnel status.
* **`lead_events`**: Audit log of all actions and score updates for a lead.
* **`automation_settings`**: Global system automation flags (`POSTING_ENABLED`, `AUTO_PUBLISH`, `MIN_LEAD_SCORE`).
