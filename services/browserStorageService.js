/**
 * Reads data from localStorage.
 * @param {string} key - The key to read from localStorage.
 * @returns {any} - The parsed JSON data or null if not found.
 */
export const readFromStorage = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error(`Error reading from storage (${key}):`, error);
        return null;
    }
};
/**
 * Writes data to localStorage.
 * @param {string} key - The key to write to localStorage.
 * @param {any} data - The data to write.
 */
export const writeToStorage = (key, data) => {
    try {
        const jsonData = JSON.stringify(data);
        localStorage.setItem(key, jsonData);
    }
    catch (error) {
        console.error(`Error writing to storage (${key}):`, error);
    }
};
