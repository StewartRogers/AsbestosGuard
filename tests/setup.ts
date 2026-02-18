import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import './mocks/server'; // Start MSW server

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// Bcrypt hash for password 'admin123' - Override with .env.local if needed
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$5Z02NRPTwYGoXxLDpqrxLuxsCeXdPyvCZdA9TWiT4ZAIljhRy6cH2';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-api-key';
process.env.NODE_ENV = 'test';

// Mock window.matchMedia (for components that use media queries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console errors during tests (optional - remove if you want to see all errors)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
