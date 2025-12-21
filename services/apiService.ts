import axios from 'axios';

// Determine API base URL based on environment
// In production (Azure), use relative URLs; in development, use localhost
const getApiBaseUrl = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // If running in production (deployed), use relative URL
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api'; // Use relative URL (same origin)
    }
  }
  
  // In development or server-side, use localhost
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Applications API
export const createApplication = async (filename: string, data: any) => {
  const response = await axios.post(`${API_BASE_URL}/applications`, { filename, data });
  return response.data;
};

export const getApplications = async () => {
  const response = await axios.get(`${API_BASE_URL}/applications`);
  return response.data;
};

export const updateApplication = async (filename: string, data: any) => {
  const response = await axios.put(`${API_BASE_URL}/applications/${filename}`, { data });
  return response.data;
};

export const deleteApplication = async (filename: string) => {
  const response = await axios.delete(`${API_BASE_URL}/applications/${filename}`);
  return response.data;
};

// Fact Sheets API
export const createFactSheet = async (filename: string, data: any) => {
  const response = await axios.post(`${API_BASE_URL}/fact-sheets`, { filename, data });
  return response.data;
};

export const getFactSheets = async () => {
  const response = await axios.get(`${API_BASE_URL}/fact-sheets`);
  return response.data;
};

export const updateFactSheet = async (filename: string, data: any) => {
  const response = await axios.put(`${API_BASE_URL}/fact-sheets/${filename}`, { data });
  return response.data;
};

export const deleteFactSheet = async (filename: string) => {
  const response = await axios.delete(`${API_BASE_URL}/fact-sheets/${filename}`);
  return response.data;
};

// AI Analysis API
export const saveAnalysis = async (filename: string, data: any) => {
  const response = await axios.post(`${API_BASE_URL}/analysis`, { filename, data });
  return response.data;
};

export const getAnalysis = async (filename: string) => {
  const response = await axios.get(`${API_BASE_URL}/analysis/${filename}`);
  return response.data;
};

export const getAllAnalyses = async () => {
  const response = await axios.get(`${API_BASE_URL}/analysis`);
  return response.data;
};

export const deleteAnalysis = async (filename: string) => {
  const response = await axios.delete(`${API_BASE_URL}/analysis/${filename}`);
  return response.data;
};