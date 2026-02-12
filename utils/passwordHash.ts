/**
 * Password Hashing Utilities
 * Uses bcrypt for secure password hashing
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a hashed password
 * @param password - The plaintext password
 * @param hash - The hashed password to compare against
 * @returns Promise<boolean> - True if passwords match, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a password hash for use in environment variables
 * Usage: node -e "require('./utils/passwordHash').generateHash('your-password')"
 */
export async function generateHash(password: string): Promise<void> {
  const hash = await hashPassword(password);
  console.log('Password hash:', hash);
  console.log('Add this to your .env.local file as ADMIN_PASSWORD_HASH');
}
