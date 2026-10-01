# Facebook & Meta Developer Setup Guide

## 1. Create a Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create a new App of type **Business**.
3. Copy your **App ID** and **App Secret** into `.env`:
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   ```

## 2. Obtain Facebook Page ID & Access Token

1. Use Graph API Explorer or Facebook Business Manager to grant your app permissions to your Facebook Page.
2. Required Page Permissions:
   * `pages_read_engagement`
   * `pages_manage_posts`
   * `pages_messaging`
   * `read_insights`
3. Generate a **Never-Expiring Page Access Token**.
4. Set `.env` variables:
   ```env
   META_PAGE_ID=your_page_id
   META_PAGE_ACCESS_TOKEN=your_page_access_token
   META_GRAPH_API_VERSION=v19.0
   ```

## 3. Webhook Setup

1. In Meta Developer Portal under **Webhooks**, select **Page**.
2. Set Callback URL:
   `https://your-domain.com/api/v1/facebook/webhook`
3. Set Verify Token:
   ```env
   META_VERIFY_TOKEN=your_custom_webhook_verify_token
   ```
4. Subscribe to Page events: `feed`, `messages`, `mention`.
