/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON responses
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Error handler middleware
 * Must be registered last in middleware chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with structured metadata
  const errorMeta = {
    name: err.name,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  if (err instanceof AppError && err.statusCode < 500) {
    logger.warn(err.message, errorMeta);
  } else {
    logger.error(err.message, { ...errorMeta, stack: err.stack });
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    res.status(403).json({
      error: {
        code: 'CORS_ERROR',
        message: 'Not allowed by CORS policy',
      },
    });
    return;
  }

  // Default to 500 Internal Server Error
  const statusCode = 500;
  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
