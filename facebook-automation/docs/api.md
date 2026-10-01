# API Endpoints Reference

Base API Path: `/api/v1`

---

## 1. Assets API

### Register Asset
* **HTTP Method**: `POST /api/v1/assets`
* **Request Body**:
  ```json
  {
    "storageKey": "logos/logo-001.png",
    "category": "logo_design",
    "title": "Modern Restaurant Logo",
    "description": "Clean vector logo for dining brand"
  }
  ```
* **Response**: `201 Created` with complete asset record.

### List Assets
* **HTTP Method**: `GET /api/v1/assets?page=1&limit=20&category=logo_design`

### Analyze Asset Vision
* **HTTP Method**: `POST /api/v1/assets/:id/analyze`
* **Response**: Triggers AI vision model to analyze CDN image and stores result in `asset.ai_analysis`.

---

## 2. Content API

### Generate Post Content
* **HTTP Method**: `POST /api/v1/content/generate`
* **Request Body**:
  ```json
  {
    "assetId": "uuid-here",
    "contentStyle": "professional",
    "objective": "generate_leads"
  }
  ```

---

## 3. Posts API

### List Posts
* **HTTP Method**: `GET /api/v1/posts?status=draft`

### Publish Post to Facebook
* **HTTP Method**: `POST /api/v1/posts/:id/publish`

### Schedule Post
* **HTTP Method**: `POST /api/v1/posts/:id/schedule`
* **Request Body**: `{ "scheduledAt": "2026-10-01T12:00:00Z" }`

### Cancel Scheduled Post
* **HTTP Method**: `POST /api/v1/posts/:id/cancel`

---

## 4. Facebook Webhooks API

### Webhook Verification
* **HTTP Method**: `GET /api/v1/facebook/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345`

### Webhook Event Ingestion
* **HTTP Method**: `POST /api/v1/facebook/webhook`

---

## 5. Leads API

### List Leads
* **HTTP Method**: `GET /api/v1/leads?minScore=60`

### Get Lead Details
* **HTTP Method**: `GET /api/v1/leads/:id`

### Update Lead Status
* **HTTP Method**: `PATCH /api/v1/leads/:id`
* **Request Body**: `{ "status": "qualified" }`

---

## 6. Automation & Dashboard API

### Get Dashboard Summary
* **HTTP Method**: `GET /api/v1/dashboard/summary`

### Update Automation Settings
* **HTTP Method**: `PATCH /api/v1/automation/settings`
* **Request Body**: `{ "auto_publish": true, "minimum_lead_score": 70 }`

### Run Manual Automation Cycle
* **HTTP Method**: `POST /api/v1/automation/run`
