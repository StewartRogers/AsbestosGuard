/**
 * Authentication Middleware
 * JWT-based authentication for protecting API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        username?: string;
        role: 'admin' | 'employer';
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  email?: string;
  username?: string;
  role: 'admin' | 'employer';
}

/**
 * Get JWT secret from environment
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Middleware to require authentication
 * Verifies JWT token from cookie or Authorization header
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Authentication token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new AuthorizationError('Admin access required'));
  }

  next();
}

/**
 * Middleware to require employer role
 * Must be used after requireAuth middleware
 */
export function requireEmployer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (req.user.role !== 'employer') {
    return next(new AuthorizationError('Employer access required'));
  }

  next();
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, getJWTSecret(), { expiresIn });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  return jwt.sign(payload, getJWTSecret(), { expiresIn });
}
