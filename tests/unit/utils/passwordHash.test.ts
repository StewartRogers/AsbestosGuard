import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../../utils/passwordHash';

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2b\$10\$/); // bcrypt format
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Due to salt
    });

    it('should hash empty string', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2b\$10\$/);
    });

    it('should hash long passwords', async () => {
      const longPassword = 'a'.repeat(100);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2b\$10\$/);
    });

    it('should hash passwords with special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2b\$10\$/);
    });

    it('should hash unicode passwords', async () => {
      const password = 'password密码🔒';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2b\$10\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await hashPassword(password);
      const result = await comparePassword(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const result = await comparePassword('testpassword123!', hash);

      expect(result).toBe(false);
    });

    it('should detect single character difference', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      const result = await comparePassword('testPassword124!', hash);

      expect(result).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const hash = await hashPassword('');
      const result = await comparePassword('', hash);

      expect(result).toBe(true);
    });

    it('should handle special characters in comparison', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should handle unicode in comparison', async () => {
      const password = 'password密码🔒';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });
  });

  describe('security properties', () => {
    it('should use bcrypt with 10 salt rounds', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);

      // bcrypt format: $2b$[rounds]$[salt+hash]
      const rounds = hash.split('$')[2];
      expect(rounds).toBe('10');
    });

    it('should be resistant to timing attacks', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);

      // Compare times for correct vs incorrect passwords
      const start1 = Date.now();
      await comparePassword(password, hash);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await comparePassword('wrong', hash);
      const time2 = Date.now() - start2;

      // Times should be similar (within 50ms) due to constant-time comparison
      expect(Math.abs(time1 - time2)).toBeLessThan(50);
    });

    it('should handle malformed hash gracefully', async () => {
      const password = 'testPassword123!';
      const malformedHash = 'not-a-valid-hash';

      const result = await comparePassword(password, malformedHash);
      expect(result).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    it('should verify admin login', async () => {
      // Simulate admin password verification
      const adminPassword = 'AdminSecurePassword123!';
      const storedHash = await hashPassword(adminPassword);

      // User attempts to login
      const loginPassword = 'AdminSecurePassword123!';
      const isValid = await comparePassword(loginPassword, storedHash);

      expect(isValid).toBe(true);
    });

    it('should reject invalid admin login', async () => {
      const adminPassword = 'AdminSecurePassword123!';
      const storedHash = await hashPassword(adminPassword);

      // User attempts to login with wrong password
      const loginPassword = 'wrongPassword';
      const isValid = await comparePassword(loginPassword, storedHash);

      expect(isValid).toBe(false);
    });

    it('should handle password reset scenario', async () => {
      // Original password
      const originalPassword = 'oldPassword123!';
      const originalHash = await hashPassword(originalPassword);

      // User resets to new password
      const newPassword = 'newPassword456!';
      const newHash = await hashPassword(newPassword);

      // Original password should not match new hash
      expect(await comparePassword(originalPassword, newHash)).toBe(false);

      // New password should match new hash
      expect(await comparePassword(newPassword, newHash)).toBe(true);
    });
  });
});
