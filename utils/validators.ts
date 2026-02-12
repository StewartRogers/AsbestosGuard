/**
 * Input Validation Utilities
 * Sanitize and validate user input to prevent security vulnerabilities
 */

/**
 * Sanitize a filename to prevent path traversal attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 *
 * @param filename - The filename to sanitize
 * @returns string - The sanitized filename
 * @throws Error - If filename is invalid or contains forbidden characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename is required and must be a string');
  }

  // Remove any path separators and suspicious patterns
  const clean = filename.replace(/[^a-zA-Z0-9-_]/g, '');

  if (!clean || clean.length === 0) {
    throw new Error('Invalid filename: no valid characters remaining after sanitization');
  }

  if (clean !== filename) {
    throw new Error(`Invalid filename: contains forbidden characters. Allowed: a-z, A-Z, 0-9, -, _`);
  }

  // Additional check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename: path traversal detected');
  }

  // Ensure filename isn't too long (max 255 characters)
  if (clean.length > 255) {
    throw new Error('Invalid filename: exceeds maximum length of 255 characters');
  }

  return clean;
}

/**
 * Validate email format
 * @param email - The email to validate
 * @returns boolean - True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (10 digits)
 * @param phone - The phone number to validate
 * @returns boolean - True if phone is valid
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Validate that a value is not empty
 * @param value - The value to check
 * @returns boolean - True if value is not empty
 */
export function isRequired(value: any): boolean {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Sanitize a string to prevent XSS attacks
 * Basic HTML escaping - for production use a library like DOMPurify
 * @param input - The string to sanitize
 * @returns string - The sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
