const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/config/database', () => {
  return {
    query: jest.fn(),
    withTransaction: jest.fn(async (cb) => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('UPDATE generated_posts')) {
            return {
              rows: [{
                id: '987e6543-e89b-12d3-a456-426614174000',
                status: 'published',
                facebook_post_id: 'mock_page_id_123456789',
                asset_id: '123e4567-e89b-12d3-a456-426614174000'
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
});

const db = require('../src/config/database');

const config = require('../src/config/env');

describe('Facebook Graph API Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SKIP_AUTH = 'true';
  });

  describe('POST /api/v1/posts/:id/publish', () => {
    it('should successfully publish a generated post to Facebook', async () => {
      // Find post by ID
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '987e6543-e89b-12d3-a456-426614174000',
          asset_id: '123e4567-e89b-12d3-a456-426614174000',
          caption: 'Great Restaurant Logo',
          cta: 'DM us for quote',
          hashtags: ['#branding'],
          status: 'draft'
        }]
      });
      // Mark publishing state update
      db.query.mockResolvedValueOnce({ rows: [] });
      // Get asset details
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Restaurant Logo',
          cdn_url: `${config.r2.publicBaseUrl}/logos/logo-001.png`
        }]
      });

      const res = await request(app)
        .post('/api/v1/posts/987e6543-e89b-12d3-a456-426614174000/publish');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('published');
      expect(res.body.data.facebook_post_id).toBeDefined();
    });

    it('should reject re-publishing an already published post', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '987e6543-e89b-12d3-a456-426614174000',
          status: 'published',
          facebook_post_id: 'fb-123456'
        }]
      });

      const res = await request(app)
        .post('/api/v1/posts/987e6543-e89b-12d3-a456-426614174000/publish');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been published');
    });
  });

  describe('GET /api/v1/facebook/webhook (Verification)', () => {
    it('should verify Meta webhook with valid hub.verify_token', async () => {
      const res = await request(app)
        .get('/api/v1/facebook/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': config.meta.verifyToken,
          'hub.challenge': 'CHALLENGE_ACCEPTED_12345'
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('CHALLENGE_ACCEPTED_12345');
    });

    it('should reject webhook verification with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/facebook/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'CHALLENGE_12345'
        });

      expect(res.status).toBe(403);
    });
  });
});
