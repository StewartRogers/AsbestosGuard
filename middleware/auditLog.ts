import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

interface AuditEvent {
  action: string;
  outcome: 'success' | 'failure';
  userId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  details?: Record<string, unknown>;
}

const auditLogger = logger.child({ component: 'audit' });

export function logAuditEvent(event: AuditEvent) {
  auditLogger.info(event.action, {
    outcome: event.outcome,
    userId: event.userId,
    role: event.role,
    ip: event.ip,
    userAgent: event.userAgent,
    resource: event.resource,
    ...event.details,
  });
}

/**
 * Middleware that logs all mutating API requests (POST, PUT, DELETE) for audit trail.
 */
export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const user = (req as Request & { user?: { userId?: string; role?: string } }).user;
    logAuditEvent({
      action: `${req.method} ${req.path}`,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      userId: user?.userId,
      role: user?.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      resource: req.path,
      details: { statusCode: res.statusCode },
    });
    return originalJson(body);
  };

  next();
}
