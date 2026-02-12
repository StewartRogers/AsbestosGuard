import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { body } from 'express-validator';
import authRoutes from '../../../routes/auth.js';
import { errorHandler } from '../../../middleware/errorHandler.js';

describe('Authentication API', () => {
  let app: Express;

  beforeAll(() => {
    // Setup test Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/auth/login/admin', () => {
    it('should login with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userId', 'admin');
      expect(response.body.user).toHaveProperty('role', 'admin');
      expect(response.body).toHaveProperty('message', 'Login successful');

      // Check that JWT cookies were set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.startsWith('token='))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.startsWith('refreshToken='))).toBe(true);
    });

    it('should reject invalid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should reject missing username', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          password: 'admin123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: '',
          password: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login/employer', () => {
    it('should login with valid employer credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/employer')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('role', 'employer');
      expect(response.body).toHaveProperty('message', 'Login successful');

      // Check that JWT cookies were set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.startsWith('token='))).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login/employer')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');

      // Check that cookies are cleared (Express clearCookie uses Expires in the past)
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      // Cookies should include either Max-Age=0 or a past Expires date
      const hasExpiredCookies = cookies.some((cookie: string) =>
        cookie.includes('Max-Age=0') || cookie.includes('Expires=Thu, 01 Jan 1970')
      );
      expect(hasExpiredCookies).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then get current user
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userId', 'admin');
      expect(response.body.user).toHaveProperty('role', 'admin');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token when valid refresh token provided', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Token refreshed successfully');

      // Check that new token cookie is set
      const newCookies = response.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      expect(newCookies.some((cookie: string) => cookie.startsWith('token='))).toBe(true);
    });

    it('should return 401 when no refresh token provided', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
    });
  });

  describe('JWT Cookie Security', () => {
    it('should set httpOnly cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should set SameSite=Strict cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies.some((cookie: string) => cookie.includes('SameSite=Strict'))).toBe(true);
    });

    it('should set appropriate Max-Age for tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login/admin')
        .send({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
        });

      const cookies = response.headers['set-cookie'];
      const tokenCookie = cookies.find((cookie: string) => cookie.startsWith('token='));
      const refreshCookie = cookies.find((cookie: string) => cookie.startsWith('refreshToken='));

      // Access token should have 1 hour expiry (3600 seconds)
      expect(tokenCookie).toMatch(/Max-Age=3600/);

      // Refresh token should have 7 days expiry (604800 seconds)
      expect(refreshCookie).toMatch(/Max-Age=604800/);
    });
  });
});
