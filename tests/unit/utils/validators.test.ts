import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../../../utils/validators';

describe('sanitizeFilename', () => {
  describe('valid filenames', () => {
    it('should accept alphanumeric characters', () => {
      const result = sanitizeFilename('abc123');
      expect(result).toBe('abc123');
    });

    it('should accept hyphens', () => {
      const result = sanitizeFilename('test-application');
      expect(result).toBe('test-application');
    });

    it('should accept underscores', () => {
      const result = sanitizeFilename('test_application');
      expect(result).toBe('test_application');
    });

    it('should accept mixed valid characters', () => {
      const result = sanitizeFilename('Test-Application_123');
      expect(result).toBe('Test-Application_123');
    });

    it('should accept single character', () => {
      const result = sanitizeFilename('a');
      expect(result).toBe('a');
    });

    it('should accept numbers only', () => {
      const result = sanitizeFilename('123456');
      expect(result).toBe('123456');
    });
  });

  describe('path traversal attacks', () => {
    it('should reject ../ sequences', () => {
      expect(() => sanitizeFilename('../etc/passwd')).toThrow('contains forbidden characters');
    });

    it('should reject ../ at the end', () => {
      expect(() => sanitizeFilename('test/..')).toThrow('contains forbidden characters');
    });

    it('should reject multiple ../ sequences', () => {
      expect(() => sanitizeFilename('../../../etc/passwd')).toThrow('contains forbidden characters');
    });

    it('should reject forward slashes', () => {
      expect(() => sanitizeFilename('test/file')).toThrow('contains forbidden characters');
    });

    it('should reject backslashes', () => {
      expect(() => sanitizeFilename('test\\file')).toThrow('contains forbidden characters');
    });

    it('should reject Windows path traversal', () => {
      expect(() => sanitizeFilename('..\\..\\windows\\system32')).toThrow('contains forbidden characters');
    });
  });

  describe('invalid characters', () => {
    it('should reject special characters', () => {
      expect(() => sanitizeFilename('test@file')).toThrow('contains forbidden characters');
    });

    it('should reject spaces', () => {
      expect(() => sanitizeFilename('test file')).toThrow('contains forbidden characters');
    });

    it('should reject dots', () => {
      expect(() => sanitizeFilename('test.file')).toThrow('contains forbidden characters');
    });

    it('should reject asterisks', () => {
      expect(() => sanitizeFilename('test*file')).toThrow('contains forbidden characters');
    });

    it('should reject question marks', () => {
      expect(() => sanitizeFilename('test?file')).toThrow('contains forbidden characters');
    });

    it('should reject quotes', () => {
      expect(() => sanitizeFilename('test"file')).toThrow('contains forbidden characters');
    });

    it('should reject angle brackets', () => {
      expect(() => sanitizeFilename('test<file>')).toThrow('contains forbidden characters');
    });

    it('should reject pipes', () => {
      expect(() => sanitizeFilename('test|file')).toThrow('contains forbidden characters');
    });
  });

  describe('edge cases', () => {
    it('should reject empty string', () => {
      expect(() => sanitizeFilename('')).toThrow('Filename is required');
    });

    it('should reject null', () => {
      expect(() => sanitizeFilename(null as any)).toThrow('Filename is required');
    });

    it('should reject undefined', () => {
      expect(() => sanitizeFilename(undefined as any)).toThrow('Filename is required');
    });

    it('should reject non-string values', () => {
      expect(() => sanitizeFilename(123 as any)).toThrow('Filename is required');
    });

    it('should reject strings with only invalid characters', () => {
      expect(() => sanitizeFilename('!@#$%^&*()')).toThrow('no valid characters remaining');
    });

    it('should reject filenames longer than 255 characters', () => {
      const longFilename = 'a'.repeat(256);
      expect(() => sanitizeFilename(longFilename)).toThrow('exceeds maximum length');
    });

    it('should accept filename with exactly 255 characters', () => {
      const filename = 'a'.repeat(255);
      const result = sanitizeFilename(filename);
      expect(result).toBe(filename);
    });
  });

  describe('security-sensitive cases', () => {
    it('should reject null byte injection', () => {
      expect(() => sanitizeFilename('test\0file')).toThrow('contains forbidden characters');
    });

    it('should reject newline characters', () => {
      expect(() => sanitizeFilename('test\nfile')).toThrow('contains forbidden characters');
    });

    it('should reject carriage return', () => {
      expect(() => sanitizeFilename('test\rfile')).toThrow('contains forbidden characters');
    });

    it('should reject tab characters', () => {
      expect(() => sanitizeFilename('test\tfile')).toThrow('contains forbidden characters');
    });

    it('should reject unicode path separators', () => {
      expect(() => sanitizeFilename('test\u2044file')).toThrow('contains forbidden characters');
    });
  });

  describe('common attack patterns', () => {
    it('should reject etc/passwd', () => {
      expect(() => sanitizeFilename('etc/passwd')).toThrow('contains forbidden characters');
    });

    it('should reject /etc/shadow', () => {
      expect(() => sanitizeFilename('/etc/shadow')).toThrow('contains forbidden characters');
    });

    it('should reject C:\\Windows\\System32', () => {
      expect(() => sanitizeFilename('C:\\Windows\\System32')).toThrow('contains forbidden characters');
    });

    it('should reject .htaccess', () => {
      expect(() => sanitizeFilename('.htaccess')).toThrow('contains forbidden characters');
    });

    it('should reject .env', () => {
      expect(() => sanitizeFilename('.env')).toThrow('contains forbidden characters');
    });
  });
});
