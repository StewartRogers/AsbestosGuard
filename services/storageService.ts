import { readFromStorage, writeToStorage } from './browserStorageService';
import { readFromFile, writeToFile } from './fileSystemStorageService';

const isBrowser = typeof window !== 'undefined';

// Determine API base URL based on environment
// In production (Azure), use relative URLs; in development, use localhost
const getApiBase = () => {
  if (!isBrowser) return '';
  
  // If running in production (deployed), use relative URL
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''; // Use relative URL (same origin)
  }
  
  // In development, use localhost
  return 'http://localhost:5000';
};

const API_BASE = getApiBase();

export const readData = async (key: string): Promise<any> => {
  if (isBrowser) {
    // In browser, call the server API to read from JSON files
    try {
      const response = await fetch(`${API_BASE}/api/data/${key}`);
      if (!response.ok) {
        console.error(`Failed to read data (${key}):`, response.statusText);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error reading data from API (${key}):`, error);
      return null;
    }
  } else {
    // On server, read directly from file
    return readFromFile(`${key}.json`);
  }
};

export const writeData = async (key: string, data: any): Promise<void> => {
  if (isBrowser) {
    // In browser, call the server API to write to JSON files
    try {
      const response = await fetch(`${API_BASE}/api/data/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      if (!response.ok) {
        console.error(`Failed to write data (${key}):`, response.statusText);
      }
    } catch (error) {
      console.error(`Error writing data to API (${key}):`, error);
    }
  } else {
    // On server, write directly to file
    await writeToFile(`${key}.json`, data);
  }
};

export const deleteData = async (key: string): Promise<void> => {
  if (isBrowser) {
    // In browser, call the server API to delete JSON files
    try {
      const response = await fetch(`${API_BASE}/api/data/${key}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        console.error(`Failed to delete data (${key}):`, response.statusText);
      }
    } catch (error) {
      console.error(`Error deleting data via API (${key}):`, error);
    }
  } else {
    // On server, delete file directly
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join('./data', `${key}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};