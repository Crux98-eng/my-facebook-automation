# Cloudflare R2 Integration Setup

## 1. Create Cloudflare R2 Bucket

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2 Object Storage**.
3. Create a bucket (e.g. `facebook-automation-assets`).

## 2. Connect Custom Domain or Public Bucket URL

1. Enable Public Access or attach a Custom Domain (e.g. `https://cdn.yourdomain.com`).
2. Set `.env` variable:
   ```env
   R2_PUBLIC_BASE_URL=https://cdn.yourdomain.com
   ```

## 3. Generate R2 API Credentials

1. In Cloudflare Dashboard, click **Manage R2 API Tokens**.
2. Create an API Token with **Object Read & Write** permissions.
3. Obtain Account ID, Access Key ID, and Secret Access Key.
4. Set `.env` variables:
   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_SECRET_ACCESS_KEY=your_secret_access_key
   R2_BUCKET_NAME=facebook-automation-assets
   ```

## 4. Registering R2 Assets in Catalog

Upload your designs directly to Cloudflare R2, then call:
```http
POST /api/v1/assets
Content-Type: application/json

{
  "storageKey": "logos/restaurant-logo.png",
  "category": "logo_design",
  "title": "Modern Restaurant Logo"
}
```
The backend automatically formats and validates the public CDN URL (`https://cdn.yourdomain.com/logos/restaurant-logo.png`).
