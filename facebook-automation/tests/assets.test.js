const request = require('supertest');
const app = require('../src/app');

// Mock dependencies
jest.mock('../src/config/database', () => {
  const mockDb = {
    query: jest.fn(),
    withTransaction: jest.fn(cb => cb({ query: jest.fn() })),
    pool: { connect: jest.fn(), on: jest.fn(), end: jest.fn() }
  };
  return mockDb;
});

const config = require('../src/config/env');

jest.mock('../src/config/r2', () => {
  const config = require('../src/config/env');
  return {
    getPublicUrl: jest.fn(key => `${config.r2.publicBaseUrl}/${key}`),
    exists: jest.fn().mockResolvedValue(true),
    upload: jest.fn().mockImplementation(key => Promise.resolve({ storageKey: key, cdnUrl: `${config.r2.publicBaseUrl}/${key}` })),
    delete: jest.fn().mockResolvedValue(true)
  };
});

const db = require('../src/config/database');

describe('Assets API Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SKIP_AUTH = 'true';
    process.env.MOCK_EXTERNAL_APIS = 'true';
  });

  describe('POST /api/v1/assets (Register Asset)', () => {
    it('should register a valid asset and construct CDN URL', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // Storage key duplicate check: none
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          storage_key: 'logos/logo-001.png',
          cdn_url: `${config.r2.publicBaseUrl}/logos/logo-001.png`,
          category: 'logo_design',
          title: 'Restaurant Logo',
          ai_analysis_status: 'pending',
          times_posted: 0
        }]
      });

      const res = await request(app)
        .post('/api/v1/assets')
        .send({
          storageKey: 'logos/logo-001.png',
          category: 'logo_design',
          title: 'Restaurant Logo'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cdn_url).toBe(`${config.r2.publicBaseUrl}/logos/logo-001.png`);
    });

    it('should prevent duplicate asset storage key registration', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-id', storage_key: 'logos/logo-001.png' }]
      });

      const res = await request(app)
        .post('/api/v1/assets')
        .send({
          storageKey: 'logos/logo-001.png',
          category: 'logo_design',
          title: 'Duplicate Logo'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/assets/:id (Retrieve Asset)', () => {
    it('should return asset details if found', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: '123e4567-e89b-12d3-a456-426614174000', title: 'Restaurant Logo' }]
      });

      const res = await request(app).get('/api/v1/assets/123e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Restaurant Logo');
    });

    it('should return 404 error if asset not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/v1/assets/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND_ERROR');
    });
  });

  describe('POST /api/v1/assets/:id/analyze (Asset Analysis)', () => {
    it('should analyze asset vision metadata and update database', async () => {
      // Find asset call
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          cdn_url: 'https://cdn.example.com/logos/logo-001.png',
          category: 'logo_design',
          title: 'Restaurant Logo'
        }]
      });
      // Update analysis DB call
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          ai_analysis_status: 'completed',
          ai_analysis: { asset_type: 'logo design' }
        }]
      });

      const res = await request(app)
        .post('/api/v1/assets/123e4567-e89b-12d3-a456-426614174000/analyze');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ai_analysis_status).toBe('completed');
    });
  });
});
