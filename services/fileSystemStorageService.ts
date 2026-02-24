import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

// Use a project-relative directory so we don't attempt to write to the filesystem root
const DATA_DIR = typeof window === 'undefined'
  ? path.resolve(process.cwd(), 'data')
  : '/data';

// Ensure the data directory exists (server-side only)
if (typeof window === 'undefined' && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Asserts that the resolved file path remains inside DATA_DIR.
 * Throws if path traversal is detected.
 */
function assertPathWithinDataDir(filePath: string): void {
  const resolvedFile = path.resolve(filePath);
  const resolvedBase = path.resolve(DATA_DIR);
  if (!resolvedFile.startsWith(resolvedBase + path.sep) && resolvedFile !== resolvedBase) {
    throw new Error('Path traversal detected: access outside data directory is not allowed');
  }
}

/**
 * Reads data from a JSON file.
 * @param {string} filename - The name of the file to read.
 * @returns {Promise<any>} - The parsed JSON data.
 */
export const readFromFile = async (filename: string): Promise<any> => {
  const filePath = path.join(DATA_DIR, filename);
  assertPathWithinDataDir(filePath);
  try {
    if (!fs.existsSync(filePath)) {
      return null; // File does not exist
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading file', { filename, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

/**
 * Writes data to a JSON file.
 * @param {string} filename - The name of the file to write.
 * @param {any} data - The data to write.
 * @returns {Promise<void>} - Resolves when the write is complete.
 */
export const writeToFile = async (filename: string, data: any): Promise<void> => {
  const filePath = path.join(DATA_DIR, filename);
  assertPathWithinDataDir(filePath);
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filePath, jsonData, 'utf-8');
  } catch (error) {
    logger.error('Error writing file', { filename, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};