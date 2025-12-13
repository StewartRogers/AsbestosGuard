import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

/**
 * Reads data from a JSON file.
 * @param {string} filename - The name of the file to read.
 * @returns {Promise<any>} - The parsed JSON data.
 */
export const readFromFile = async (filename: string): Promise<any> => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      return null; // File does not exist
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error);
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
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filePath, jsonData, 'utf-8');
  } catch (error) {
    console.error(`Error writing file ${filename}:`, error);
    throw error;
  }
};