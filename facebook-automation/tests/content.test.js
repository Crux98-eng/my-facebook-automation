const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/config/database', () => {
  return {
    query: jest.fn(),
    withTransaction: jest.fn(cb => cb({ query: jest.fn() })),
    pool: { connect: jest.fn(), on: jest.fn(), end: jest.fn() }
  };
});

const db = require('../src/config/database');

describe('Content Generation Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SKIP_AUTH = 'true';
  });

  describe('POST /api/v1/content/generate', () => {
    it('should generate draft post content from asset details', async () => {
      // Find asset
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Restaurant Logo',
          category: 'logo_design',
          ai_analysis_status: 'completed'
        }]
      });
      // Check recently posted asset (cooldown check) -> false
      db.query.mockResolvedValueOnce({ rows: [] });
      // Create post DB insert
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '987e6543-e89b-12d3-a456-426614174000',
          asset_id: '123e4567-e89b-12d3-a456-426614174000',
          caption: 'Take your brand to the next level...',
          status: 'draft'
        }]
      });

      const res = await request(app)
        .post('/api/v1/content/generate')
        .send({
          assetId: '123e4567-e89b-12d3-a456-426614174000',
          contentStyle: 'professional',
          objective: 'generate_leads'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
    });
  });
});
