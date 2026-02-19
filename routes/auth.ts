/**
 * Authentication Routes
 * Handles login, logout, and authentication status
 *
 * @openapi
 * /auth/login/admin:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *                 message: { type: string }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /auth/login/employer:
 *   post:
 *     tags: [Auth]
 *     summary: Employer login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *                 message: { type: string }
 *       401:
 *         description: Invalid credentials
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and clear cookies
 *     responses:
 *       200:
 *         description: Logout successful
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authenticated
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token cookie
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: No or invalid refresh token
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { comparePassword } from '../utils/passwordHash.js';
import { generateToken, generateRefreshToken, requireAuth } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/auth/login/admin
 * Admin login with username and password
 */
router.post(
  '/login/admin',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { username, password } = req.body;

    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminPasswordHash) {
      throw new Error('Admin password hash not configured in environment variables');
    }

    // Verify username
    if (username !== adminUsername) {
      logAuditEvent({ action: 'admin_login', outcome: 'failure', ip: req.ip, details: { reason: 'invalid_username' } });
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await comparePassword(password, adminPasswordHash);
    if (!isValid) {
      logAuditEvent({ action: 'admin_login', outcome: 'failure', ip: req.ip, details: { reason: 'invalid_password' } });
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate tokens
    const payload = {
      userId: 'admin',
      username: adminUsername,
      role: 'admin' as const,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set HTTP-only cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 3600000, // 7 days
    });

    logAuditEvent({ action: 'admin_login', outcome: 'success', userId: 'admin', role: 'admin', ip: req.ip });

    // Return user info (without sensitive data)
    res.json({
      user: {
        userId: 'admin',
        username: adminUsername,
        role: 'admin',
      },
      message: 'Login successful',
    });
  })
);

/**
 * POST /api/auth/login/employer
 * Employer login with email and password
 * Note: Currently accepts any valid email for demo purposes
 * In production, this should verify against a database
 */
router.post(
  '/login/employer',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // TODO: In production, verify against database
    // For now, accept any email/password for demo purposes
    if (!email || !password) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate tokens
    const payload = {
      userId: email.toLowerCase(),
      email: email.toLowerCase(),
      role: 'employer' as const,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set HTTP-only cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 3600000, // 7 days
    });

    logAuditEvent({ action: 'employer_login', outcome: 'success', userId: email.toLowerCase(), role: 'employer', ip: req.ip });

    // Return user info
    res.json({
      user: {
        userId: email.toLowerCase(),
        email: email.toLowerCase(),
        role: 'employer',
      },
      message: 'Login successful',
    });
  })
);

/**
 * POST /api/auth/logout
 * Clear authentication cookies
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');

  res.json({
    message: 'Logout successful',
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Requires authentication
 */
router.get(
  '/me',
  requireAuth,
  (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }

    res.json({
      user: {
        userId: req.user.userId,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
      },
    });
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AuthenticationError('No refresh token provided');
    }

    // Verify refresh token (using same logic as requireAuth)
    // In production, you might want separate logic for refresh tokens
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(refreshToken, secret) as {
      userId: string;
      email?: string;
      username?: string;
      role: 'admin' | 'employer';
    };

    // Generate new access token
    const newToken = generateToken({
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    });

    // Set new token cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.json({
      message: 'Token refreshed successfully',
    });
  })
);

export default router;
