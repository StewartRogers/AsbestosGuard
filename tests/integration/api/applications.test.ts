import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from '../../../routes/auth.js';
import { requireAuth } from '../../../middleware/auth.js';
import { errorHandler, asyncHandler } from '../../../middleware/errorHandler.js';
import { sanitizeFilename } from '../../../utils/validators.js';
import { body } from 'express-validator';
import { ValidationError } from '../../../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Applications API', () => {
  let app: Express;
  let authToken: string[];
  const TEST_DATA_DIR = path.join(__dirname, '../../../data-test/applications');

  beforeAll(async () => {
    // Setup test Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);

    // Mock applications endpoints
    app.get('/api/applications', requireAuth, asyncHandler(async (req, res) => {
      try {
        await fs.access(TEST_DATA_DIR);
      } catch {
        await fs.mkdir(TEST_DATA_DIR, { recursive: true });
      }

      const files = await fs.readdir(TEST_DATA_DIR);
      const applications = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(TEST_DATA_DIR, file), 'utf-8');
          applications.push(JSON.parse(content));
        }
      }

      res.json(applications);
    }));

    app.post('/api/applications', requireAuth, [
      body('filename').trim().notEmpty(),
      body('data').isObject(),
    ], asyncHandler(async (req, res) => {
      const { filename, data } = req.body;
      const sanitized = sanitizeFilename(filename);
      const filepath = path.join(TEST_DATA_DIR, `${sanitized}.json`);

      await fs.mkdir(TEST_DATA_DIR, { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));

      res.json({ message: 'Application created successfully', filename: sanitized });
    }));

    app.put('/api/applications/:filename', requireAuth, asyncHandler(async (req, res) => {
      const { filename } = req.params;
      const { data } = req.body;
      const sanitized = sanitizeFilename(filename);
      const filepath = path.join(TEST_DATA_DIR, `${sanitized}.json`);

      await fs.writeFile(filepath, JSON.stringify(data, null, 2));

      res.json({ message: 'Application updated successfully', filename: sanitized });
    }));

    app.delete('/api/applications/:filename', requireAuth, asyncHandler(async (req, res) => {
      const { filename } = req.params;
      const sanitized = sanitizeFilename(filename);
      const filepath = path.join(TEST_DATA_DIR, `${sanitized}.json`);

      await fs.unlink(filepath);

      res.json({ message: 'Application deleted successfully', filename: sanitized });
    }));

    app.use(errorHandler);

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login/admin')
      .send({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      });

    authToken = loginResponse.headers['set-cookie'];
  });

  beforeEach(async () => {
    // Clean test data directory before each test
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
      await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    } catch (error) {
      // Directory doesn't exist yet, ignore
    }
  });

  afterAll(async () => {
    // Clean up test data directory
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/applications', () => {
    it('should create a new application', async () => {
      const applicationData = {
        companyName: 'Test Company',
        email: 'test@example.com',
        licenseType: 'Contractor',
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Cookie', authToken)
        .send({
          filename: 'test-application',
          data: applicationData,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Application created successfully');
      expect(response.body).toHaveProperty('filename', 'test-application');

      // Verify file was created
      const filepath = path.join(TEST_DATA_DIR, 'test-application.json');
      const content = await fs.readFile(filepath, 'utf-8');
      const saved = JSON.parse(content);
      expect(saved).toEqual(applicationData);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          filename: 'test-application',
          data: { companyName: 'Test' },
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
    });

    it('should reject path traversal in filename', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Cookie', authToken)
        .send({
          filename: '../../../etc/passwd',
          data: { companyName: 'Test' },
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject special characters in filename', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Cookie', authToken)
        .send({
          filename: 'test@#$%^&*().json',
          data: { companyName: 'Test' },
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/applications', () => {
    it('should return empty array when no applications exist', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all applications', async () => {
      // Create test applications
      const app1 = { companyName: 'Company 1', email: 'test1@example.com' };
      const app2 = { companyName: 'Company 2', email: 'test2@example.com' };

      await fs.writeFile(
        path.join(TEST_DATA_DIR, 'app1.json'),
        JSON.stringify(app1)
      );
      await fs.writeFile(
        path.join(TEST_DATA_DIR, 'app2.json'),
        JSON.stringify(app2)
      );

      const response = await request(app)
        .get('/api/applications')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(expect.arrayContaining([app1, app2]));
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/applications')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
    });
  });

  describe('PUT /api/applications/:filename', () => {
    beforeEach(async () => {
      // Create an application to update
      const initialData = { companyName: 'Initial Company', email: 'initial@example.com' };
      await fs.writeFile(
        path.join(TEST_DATA_DIR, 'test-app.json'),
        JSON.stringify(initialData)
      );
    });

    it('should update an existing application', async () => {
      const updatedData = { companyName: 'Updated Company', email: 'updated@example.com' };

      const response = await request(app)
        .put('/api/applications/test-app')
        .set('Cookie', authToken)
        .send({ data: updatedData })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Application updated successfully');

      // Verify file was updated
      const content = await fs.readFile(path.join(TEST_DATA_DIR, 'test-app.json'), 'utf-8');
      const saved = JSON.parse(content);
      expect(saved).toEqual(updatedData);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/applications/test-app')
        .send({ data: { companyName: 'Updated' } })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/applications/:filename', () => {
    beforeEach(async () => {
      // Create an application to delete
      await fs.writeFile(
        path.join(TEST_DATA_DIR, 'delete-me.json'),
        JSON.stringify({ companyName: 'Delete Me' })
      );
    });

    it('should delete an application', async () => {
      const response = await request(app)
        .delete('/api/applications/delete-me')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Application deleted successfully');

      // Verify file was deleted
      try {
        await fs.access(path.join(TEST_DATA_DIR, 'delete-me.json'));
        throw new Error('File should not exist');
      } catch (error: any) {
        expect(error.code).toBe('ENOENT');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/applications/delete-me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error when file does not exist', async () => {
      const response = await request(app)
        .delete('/api/applications/nonexistent')
        .set('Cookie', authToken)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
