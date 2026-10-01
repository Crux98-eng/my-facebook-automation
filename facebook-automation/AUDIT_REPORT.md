# Facebook Automation Backend — Second-Pass Technical Audit Report

This technical audit report reviews the codebase against all business, security, architectural, and production requirements.

---

## 1. Executive Summary & Status Overview

| Component | Status | Classification | Key Findings & Deficiencies Identified |
|---|---|---|---|
| **Architecture** | PASS WITH CONDITIONS | HIGH | Standard Express/PostgreSQL setup exists, but `schedulerService.init()` runs inside `src/server.js`. If scaled with `pm2 -i max`, duplicate cron workers will run in parallel. Needs a dedicated `src/worker.js` entry point. |
| **Database** | PASS WITH CONDITIONS | HIGH | Core tables exist. Lacks `facebook_events` table (for event deduplication), `conversations`, and `messages` tables for chat context. Lacks `analysis_version` & tracking fields on assets. |
| **Cloudflare R2** | PASS WITH CONDITIONS | HIGH | R2 S3 client & CDN URL formatter implemented, but lacks `POST /api/v1/assets/sync` endpoint for auto-discovering R2 bucket items. Lacks strict host validation on client CDN URLs. |
| **AI Vision & Text** | PASS WITH CONDITIONS | MEDIUM | Vision & Content generation abstractions exist. Lacks schema validation for model tracking metadata (`analysis_version`, `analyzed_at`, `prompt_version`). Content prompt requires anti-hallucination rules. |
| **Facebook Graph API** | PASS WITH CONDITIONS | HIGH | Client exists, but lacks token expiration detection, automatic token health checks, admin failure notifications, and `GET /api/v1/facebook/capabilities` endpoint. |
| **Facebook Webhook** | PASS WITH CONDITIONS | CRITICAL | Webhook GET verification & POST async handling work, but lacks persistent `facebook_events` table with `event_id UNIQUE` constraint to guarantee event deduplication on Meta webhook retries. |
| **Scheduler** | PASS WITH CONDITIONS | HIGH | `node-cron` jobs configured, but tied directly to the Express server process. Must be separated into a standalone worker process or protected by locking. |
| **Lead Detection** | PASS WITH CONDITIONS | MEDIUM | Lead classification & scoring implemented, but needs deterministic matching (`facebook_user_id` + `source`) and full `lead_events` audit trail for all state transitions. |
| **Email Service** | PASS | LOW | Resend service functions properly with `MIN_LEAD_SCORE` and `notified_at` deduplication. |
| **Security** | PASS WITH CONDITIONS | HIGH | Helmet, CORS, Joi, rate limiting, and JWT exist. Needs strict CDN URL domain validation to prevent arbitrary image posting. |
| **Testing** | PASS | LOW | 16 unit tests passing. Needs additional tests for R2 sync, asset selection, token capabilities, and end-to-end mock mode. |

---

## 2. Detailed Audit Findings & Classifications

### [CRITICAL] Webhook Event Deduplication Missing Database Persistence
* **Issue**: Webhooks processed events in-memory without recording event IDs in a `facebook_events` table with a `UNIQUE` constraint. If Meta retries a webhook notification due to network lag, duplicate leads or comments could be created.
* **Impact**: Duplicate lead creation, duplicate score triggers, spam notifications.
* **Recommended Fix**: Add `facebook_events` table with `event_id VARCHAR UNIQUE`, store received payloads, and skip processing if `event_id` already exists.

### [HIGH] Multi-Instance Worker Race Conditions (PM2 Clustering)
* **Issue**: `src/server.js` automatically initializes `schedulerService.init()` on startup. In clustered environments (`pm2 start src/server.js -i max`), every node process runs cron jobs concurrently.
* **Impact**: Double publishing of scheduled posts, duplicate AI generation requests.
* **Recommended Fix**: Separate worker into `src/worker.js` and allow disabling cron in API process via environment variable `ENABLE_SCHEDULER=false`.

### [HIGH] Missing R2 Bucket Auto-Sync Endpoint
* **Issue**: Asset catalog required manual asset-by-asset registration. `POST /api/v1/assets/sync` was missing.
* **Impact**: Inconvenient asset onboarding workflow when bulk uploading to Cloudflare R2.
* **Recommended Fix**: Implement `POST /api/v1/assets/sync` leveraging `@aws-sdk/client-s3` `ListObjectsV2Command`, filtering supported image types, and returning sync statistics (`scanned`, `newAssets`, `existingAssets`, `skipped`).

### [HIGH] Missing Dedicated Asset Selection Service
* **Issue**: Asset selection for post creation relied on simple database queries rather than a specialized selection service evaluating posting history, categories, cooldowns, and performance.
* **Impact**: Potential sub-optimal asset rotation.
* **Recommended Fix**: Create `src/modules/assets/asset-selection.service.js` with `selectNextAsset()`, `selectAssetsForCampaign()`, and `getEligibleAssets()`.

### [HIGH] Missing Facebook Capability & Token Health Endpoint
* **Issue**: The system checked token presence, but did not validate token permissions, expiration, or report granular capabilities via `GET /api/v1/facebook/capabilities`.
* **Impact**: Operations could fail mid-execution if Page access tokens expired or lost permissions.
* **Recommended Fix**: Implement `GET /api/v1/facebook/capabilities` testing token validity, permission scopes, and returning granular capability statuses (`connected`, `publishing`, `comments`, `messaging`).

### [HIGH] Missing Conversation & Message History Schema
* **Issue**: Engagement was tracked per object, but structured multi-turn message conversations were not stored in dedicated `conversations` and `messages` tables.
* **Impact**: Unable to build conversational context for lead nurturing.
* **Recommended Fix**: Add `conversations` and `messages` tables in migrations.

### [MEDIUM] CDN URL Domain Validation
* **Issue**: Asset registration allowed arbitrary external `storageKey` strings without validating that the constructed CDN URL matches the expected `R2_PUBLIC_BASE_URL` domain host.
* **Impact**: Potential SSRF or arbitrary URL posting if corrupted data is registered.
* **Recommended Fix**: Validate CDN URL host against configured `R2_PUBLIC_BASE_URL` in `asset.service.js`.

### [MEDIUM] End-to-End Mock Mode (`MOCK_EXTERNAL_APIS=true`)
* **Issue**: Testing full workflow required either real Meta/AI/Resend API keys or isolated unit tests.
* **Impact**: Difficult to perform full end-to-end integration tests in offline development environment.
* **Recommended Fix**: Add support for `MOCK_EXTERNAL_APIS=true` across all services.

### [LOW] Granular Health Check Endpoint
* **Issue**: `/health` returned basic process uptime without testing database pool or component readiness.
* **Impact**: Monitoring tools couldn't assess database or worker status.
* **Recommended Fix**: Enhance `/health` to return status for `database`, `r2`, `ai`, `facebook`, `email`, and `worker`.

---

## 3. Corrective Action Plan

1. **Database Schema Enhancements (`002_audit_fixes_schema.sql`)**:
   - Add `facebook_events` table (`event_id UNIQUE`, status, payload, metadata).
   - Add `conversations` and `messages` tables.
   - Add `analysis_version`, `analysis_model`, `analyzed_at`, `prompt_version` to `assets`.
2. **Modules & Services**:
   - Create `src/modules/assets/asset-selection.service.js`.
   - Add `POST /api/v1/assets/sync` endpoint in `asset.service.js`, `asset.controller.js`, `asset.routes.js`.
   - Update `facebook.client.js` and add `GET /api/v1/facebook/capabilities`.
   - Update `facebook.webhook.controller.js` to persist event deduplication via `facebook_events`.
   - Update `lead.service.js` to record conversation history and comprehensive `lead_events`.
   - Create standalone worker process `src/worker.js`.
   - Update `src/app.js` health endpoint for granular status report.
3. **Testing & Verification**:
   - Add unit/integration tests for R2 sync, asset selection, token capabilities, event deduplication, and `MOCK_EXTERNAL_APIS` mode.
