import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for file output
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (stack) {
    log += `\n${stack}`;
  }
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

// Custom log format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (stack) {
    log += `\n${stack}`;
  }
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';
const LOG_DIR = process.env.LOG_DIR || 'logs';

// Create logger instance
const logger = winston.createLogger({
  level: IS_PRODUCTION ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
  ),
  defaultMeta: { service: 'asbestosguard' },
  transports: [
    // Console transport (always active except in test)
    ...(!IS_TEST ? [
      new winston.transports.Console({
        format: combine(
          colorize(),
          consoleFormat,
        ),
      }),
    ] : []),

    // File transports (active in production or when LOG_DIR is set)
    ...(IS_PRODUCTION || process.env.LOG_DIR ? [
      // Combined log file
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        format: fileFormat,
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
      }),
      // Error log file
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

export default logger;
