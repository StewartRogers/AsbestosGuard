import { readFromStorage, writeToStorage } from './browserStorageService';
import { readFromFile, writeToFile } from './fileSystemStorageService';

const isBrowser = typeof window !== 'undefined';

export const readData = async (key: string): Promise<any> => {
  if (isBrowser) {
    return readFromStorage(key);
  } else {
    return readFromFile(`${key}.json`);
  }
};

export const writeData = async (key: string, data: any): Promise<void> => {
  if (isBrowser) {
    writeToStorage(key, data);
  } else {
    await writeToFile(`${key}.json`, data);
  }
};