const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/config/database', () => {
  const config = require('../src/config/env');
  const mockDb = {
    query: jest.fn().mockImplementation((sql, values) => {
      if (sql.includes('SELECT * FROM assets WHERE id = $1')) {
        return {
          rows: [{
            id: 'asset-uuid-100',
            storage_key: 'logos/logo-e2e.png',
            cdn_url: `${config.r2.publicBaseUrl}/logos/logo-e2e.png`,
            category: 'logo_design',
            title: 'E2E Logo',
            ai_analysis_status: 'completed',
            times_posted: 0
          }]
        };
      }
      if (sql.includes('SELECT * FROM assets WHERE storage_key')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO assets')) {
        return {
          rows: [{
            id: 'asset-uuid-100',
            storage_key: 'logos/logo-e2e.png',
            cdn_url: `${config.r2.publicBaseUrl}/logos/logo-e2e.png`,
            category: 'logo_design',
            title: 'E2E Logo',
            ai_analysis_status: 'completed',
            times_posted: 0
          }]
        };
      }
      if (sql.includes('INSERT INTO generated_posts')) {
        return {
          rows: [{
            id: 'post-uuid-200',
            asset_id: 'asset-uuid-100',
            caption: 'E2E Test Post Caption',
            status: 'draft'
          }]
        };
      }
      if (sql.includes('SELECT gp.*, a.title as asset_title') || sql.includes('FROM generated_posts gp')) {
        return {
          rows: [{
            id: 'post-uuid-200',
            asset_id: 'asset-uuid-100',
            caption: 'E2E Test Post Caption',
            status: 'draft'
          }]
        };
      }
      if (sql.includes('INSERT INTO facebook_events')) {
        return { rows: [{ event_id: values ? values[0] : 'evt-1' }] };
      }
      if (sql.includes('SELECT * FROM leads WHERE facebook_user_id')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO leads')) {
        return {
          rows: [{
            id: 'lead-uuid-300',
            facebook_user_id: 'user-789',
            lead_score: 90,
            intent: 'pricing_inquiry',
            status: 'new'
          }]
        };
      }
      return { rows: [] };
    }),
    withTransaction: jest.fn(async (cb) => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('INSERT INTO leads')) {
            return {
              rows: [{
                id: 'lead-uuid-300',
                facebook_user_id: 'user-789',
                lead_score: 90,
                intent: 'pricing_inquiry',
                status: 'new'
              }]
            };
          }
          if (sql.includes('UPDATE generated_posts')) {
            return {
              rows: [{
                id: 'post-uuid-200',
                status: 'published',
                facebook_post_id: 'fb-post-999',
                asset_id: 'asset-uuid-100'
              }]
            };
          }
          return { rows: [] };
        })
      };
      return await cb(mockClient);
    }),
    pool: { connect: jest.fn(), on: jest.fn(), end: jest.fn() }
  };
  return mockDb;
});

describe('End-to-End Automated Business Flow Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SKIP_AUTH = 'true';
    process.env.MOCK_EXTERNAL_APIS = 'true';
  });

  it('should execute full E2E pipeline from asset upload to lead notification', async () => {
    // 1. Register R2 Asset
    const regRes = await request(app)
      .post('/api/v1/assets')
      .send({
        storageKey: 'logos/logo-e2e.png',
        category: 'logo_design',
        title: 'E2E Logo'
      });
    expect(regRes.status).toBe(201);
    expect(regRes.body.data.id).toBeDefined();

    // 2. Generate Content
    const genRes = await request(app)
      .post('/api/v1/content/generate')
      .send({
        assetId: 'asset-uuid-100',
        contentStyle: 'professional',
        objective: 'generate_leads'
      });
    expect(genRes.status).toBe(201);
    expect(genRes.body.data.caption).toBeDefined();

    // 3. Publish Post
    const pubRes = await request(app)
      .post('/api/v1/posts/post-uuid-200/publish');
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.status).toBe('published');

    // 4. Ingest Facebook Webhook Comment Event
    const webhookRes = await request(app)
      .post('/api/v1/facebook/webhook')
      .send({
        object: 'page',
        entry: [{
          id: 'page-123',
          changes: [{
            field: 'feed',
            value: {
              item: 'comment',
              verb: 'add',
              comment_id: 'comment-e2e-1',
              post_id: 'fb-post-999',
              message: 'How much would you charge for a logo design?',
              from: { id: 'user-789', name: 'Jane Doe' },
              created_time: 1600000000
            }
          }]
        }]
      });
    expect(webhookRes.status).toBe(200);
    expect(webhookRes.text).toBe('EVENT_RECEIVED');
  });
});
