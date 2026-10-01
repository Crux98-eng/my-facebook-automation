const config = require('../src/config/env');
const r2Service = require('../src/config/r2');
const facebookClient = require('../src/modules/facebook/facebook.client');
const axios = require('axios');

async function runPipelineTest() {
  console.log('=====================================================');
  console.log('  Facebook Page Publishing Pipeline End-to-End Test  ');
  console.log('=====================================================\n');

  let currentStage = '0. Pre-Flight Verification';
  let selectedAssetKey = null;
  let downloadedBuffer = null;
  let mimeType = null;
  let publicCdnUrl = null;

  try {
    // ----------------------------------------------------
    // PRE-FLIGHT CREDENTIAL & REACHABILITY VERIFICATION
    // ----------------------------------------------------
    console.log('[Pre-Flight Verification]');
    console.log('  R2_ACCOUNT_ID:         ', config.r2.accountId ? 'configured' : 'MISSING');
    console.log('  R2_ACCESS_KEY_ID:      ', config.r2.accessKeyId ? 'configured' : 'MISSING');
    console.log('  R2_SECRET_ACCESS_KEY:  ', config.r2.secretAccessKey ? 'configured' : 'MISSING');
    console.log('  R2_BUCKET_NAME:        ', config.r2.bucketName ? 'configured' : 'MISSING');
    console.log('  R2_PUBLIC_BASE_URL:    ', config.r2.publicBaseUrl ? 'configured' : 'MISSING');
    console.log('  META_APP_ID:           ', config.meta.appId ? 'configured' : 'MISSING');
    console.log('  META_APP_SECRET:       ', config.meta.appSecret ? 'configured' : 'MISSING');
    console.log('  META_PAGE_ID:          ', config.meta.pageId ? `configured (${config.meta.pageId === 'mock_page_id' ? 'placeholder: mock_page_id' : 'configured'})` : 'MISSING');
    console.log('  META_PAGE_ACCESS_TOKEN:', config.meta.accessToken ? 'configured' : 'MISSING');
    console.log('  META_GRAPH_API_VERSION:', config.meta.apiVersion ? `configured (${config.meta.apiVersion})` : 'MISSING');

    if (!config.r2.accountId || !config.r2.accessKeyId || !config.r2.secretAccessKey) {
      throw new Error('R2 credentials are incomplete. Please verify R2 environment variables.');
    }

    // ----------------------------------------------------
    // STAGE 1: R2 ASSET LOOKUP
    // ----------------------------------------------------
    currentStage = '1. R2 asset lookup';
    console.log(`\n[Stage 1: ${currentStage}]`);
    console.log('  Scanning bucket for assets under "assets/posters/"...');

    const objects = await r2Service.list('assets/posters/');
    const validPosters = (objects || []).filter(obj => {
      const key = (obj.Key || '').toLowerCase();
      return key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.webp');
    });

    if (validPosters.length === 0) {
      throw new Error('No valid poster images found in Cloudflare R2 under "assets/posters/"');
    }

    console.log(`  Found ${validPosters.length} valid poster(s):`);
    validPosters.forEach((p, idx) => {
      console.log(`    [${idx + 1}] ${p.Key} (${p.Size} bytes)`);
    });

    // Select the first valid poster
    selectedAssetKey = validPosters[0].Key;
    publicCdnUrl = r2Service.getPublicUrl(selectedAssetKey);
    console.log(`  -> Selected Asset: "${selectedAssetKey}"`);
    console.log(`  -> Resolved CDN URL: "${publicCdnUrl}"`);

    // ----------------------------------------------------
    // STAGE 2: R2 ASSET DOWNLOAD
    // ----------------------------------------------------
    currentStage = '2. R2 asset download';
    console.log(`\n[Stage 2: ${currentStage}]`);
    console.log(`  Downloading asset from Cloudflare R2: "${selectedAssetKey}"...`);

    const downloadResult = await r2Service.download(selectedAssetKey);
    if (!downloadResult || !downloadResult.buffer || downloadResult.buffer.length === 0) {
      throw new Error(`Failed to retrieve binary buffer for "${selectedAssetKey}" from R2`);
    }

    downloadedBuffer = downloadResult.buffer;
    mimeType = downloadResult.contentType || (selectedAssetKey.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    console.log(`  -> Successfully downloaded ${downloadedBuffer.length} bytes from R2`);
    console.log(`  -> Content-Type: ${mimeType}`);

    // ----------------------------------------------------
    // STAGE 3: IMAGE / MEDIA PREPARATION
    // ----------------------------------------------------
    currentStage = '3. image/media preparation';
    console.log(`\n[Stage 3: ${currentStage}]`);
    const caption = 'Test post from the social media automation system.';
    const fileName = selectedAssetKey.split('/').pop();
    console.log(`  Prepared media payload:`);
    console.log(`    File Name: ${fileName}`);
    console.log(`    MIME Type: ${mimeType}`);
    console.log(`    Size:      ${downloadedBuffer.length} bytes`);
    console.log(`    Caption:   "${caption}"`);

    // ----------------------------------------------------
    // STAGE 4: META AUTHENTICATION
    // ----------------------------------------------------
    currentStage = '4. Meta authentication';
    console.log(`\n[Stage 4: ${currentStage}]`);
    console.log(`  Verifying connection to Meta Graph API (${config.meta.apiVersion})...`);

    const version = config.meta.apiVersion || 'v19.0';
    let authError = null;

    try {
      const authCheckRes = await axios.get(`https://graph.facebook.com/${version}/me`, {
        params: {
          access_token: config.meta.accessToken,
          fields: 'id,name'
        },
        timeout: 10000
      });
      console.log(`  -> Meta token authentication successful. Authenticated Identity ID: ${authCheckRes.data.id}`);
    } catch (err) {
      const status = err.response?.status || 'Network Error';
      const metaError = err.response?.data?.error;
      const errorMsg = metaError?.message || err.message;
      authError = { status, errorMsg, code: metaError?.code };
      console.error(`  -> Meta Authentication Failed: [HTTP ${status}] ${errorMsg}`);
      throw new Error(`[Stage 4: Meta authentication] HTTP ${status} - ${errorMsg}`);
    }

    // ----------------------------------------------------
    // STAGE 5: FACEBOOK PAGE ACCESS
    // ----------------------------------------------------
    currentStage = '5. Facebook Page access';
    console.log(`\n[Stage 5: ${currentStage}]`);
    let targetPageId = config.meta.pageId;

    if (!targetPageId || targetPageId === 'mock_page_id') {
      throw new Error(`[Stage 5: Facebook Page access] META_PAGE_ID is currently set to placeholder 'mock_page_id' or is unconfigured. A valid Facebook Page ID is required.`);
    }

    console.log(`  Verifying access to Facebook Page ID: ${targetPageId}...`);
    let pageData = null;
    let pageAccessToken = null;

    // Check user's managed pages via /me/accounts
    try {
      const accountsRes = await axios.get(`https://graph.facebook.com/${version}/me/accounts`, {
        params: {
          access_token: config.meta.accessToken,
          fields: 'id,name,category,access_token'
        },
        timeout: 10000
      });
      const pages = accountsRes.data?.data || [];
      console.log(`  Found ${pages.length} managed page(s) on Meta account:`);
      pages.forEach(p => console.log(`    - "${p.name}" (ID: ${p.id})`));

      const matched = pages.find(p => p.id === targetPageId);
      if (matched) {
        pageData = matched;
        pageAccessToken = matched.access_token;
      } else if (pages.length > 0) {
        // If configured META_PAGE_ID is the user ID or doesn't match, auto-select the user's primary page
        console.log(`  Note: Configured META_PAGE_ID (${targetPageId}) is not in page list (or is a user profile ID). Selected managed page: "${pages[0].name}" (${pages[0].id})`);
        targetPageId = pages[0].id;
        pageData = pages[0];
        pageAccessToken = pages[0].access_token;
      }
    } catch (accErr) {
      console.log(`  Note: Could not query /me/accounts: ${accErr.message}`);
    }

    if (!pageData) {
      try {
        const pageRes = await axios.get(`https://graph.facebook.com/${version}/${targetPageId}`, {
          params: {
            access_token: config.meta.accessToken,
            fields: 'id,name'
          },
          timeout: 10000
        });
        pageData = pageRes.data;
      } catch (err) {
        const status = err.response?.status || 'Network Error';
        const metaError = err.response?.data?.error;
        const errorMsg = metaError?.message || err.message;
        throw new Error(`[Stage 5: Facebook Page access] HTTP ${status} - ${errorMsg}`);
      }
    }

    console.log(`  -> Facebook Page verified: "${pageData.name}" (ID: ${targetPageId})`);

    // ----------------------------------------------------
    // STAGE 6 & 7: META API REQUEST & MEDIA PUBLISHING
    // ----------------------------------------------------
    currentStage = '6. Meta API request / 7. Facebook media publishing';
    console.log(`\n[Stage 6 & 7: ${currentStage}]`);
    console.log(`  Publishing photo to Facebook Page "${pageData.name}" (${targetPageId})...`);

    let publishResult;
    try {
      const publishEndpoint = `https://graph.facebook.com/${version}/${targetPageId}/photos`;
      const tokenToUse = pageAccessToken || config.meta.accessToken;
      const res = await axios.post(publishEndpoint, {
        url: publicCdnUrl,
        caption: caption,
        access_token: tokenToUse
      });
      const data = res.data;
      const postId = data.post_id || data.id;

      let postPermalink = `https://facebook.com/${postId}`;
      try {
        const detailRes = await axios.get(`https://graph.facebook.com/${version}/${postId}`, {
          params: {
            access_token: tokenToUse,
            fields: 'permalink_url'
          }
        });
        if (detailRes.data?.permalink_url) {
          postPermalink = detailRes.data.permalink_url;
        }
      } catch (e) {
        // Fallback to standard permalink
      }

      publishResult = {
        facebookPostId: postId,
        facebookPermalink: postPermalink,
        raw: data
      };
    } catch (err) {
      const status = err.response?.status || 'API Error';
      const metaError = err.response?.data?.error;
      const errorMsg = metaError?.message || err.message;
      throw new Error(`[Stage 7: Facebook media publishing] HTTP ${status} - ${errorMsg}`);
    }

    // ----------------------------------------------------
    // SUCCESS SUMMARY
    // ----------------------------------------------------
    console.log('\n=====================================================');
    console.log('              TEST RESULT: SUCCESS!                  ');
    console.log('=====================================================');
    console.log('  Selected Asset Key:    ', selectedAssetKey);
    console.log('  Facebook Page ID:      ', targetPageId);
    console.log('  Published Post ID:     ', publishResult.facebookPostId);
    console.log('  Facebook Post URL:     ', publishResult.facebookPermalink);
    console.log('  Meta Response:         ', JSON.stringify(publishResult));
    console.log('=====================================================\n');

    return {
      success: true,
      selectedAssetKey,
      pageId: targetPageId,
      publishResult
    };

  } catch (err) {
    console.log('\n=====================================================');
    console.log('              TEST RESULT: FAILED                    ');
    console.log('=====================================================');
    console.log(`  Failed Stage:          ${currentStage}`);
    console.log(`  Selected Asset:        ${selectedAssetKey || 'None'}`);
    console.log(`  Configured Page ID:    ${config.meta.pageId || 'None'}`);
    console.log(`  Error Details:         ${err.message}`);
    console.log('=====================================================\n');

    return {
      success: false,
      failedStage: currentStage,
      selectedAssetKey,
      pageId: config.meta.pageId,
      error: err.message
    };
  }
}

if (require.main === module) {
  runPipelineTest().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { runPipelineTest };
