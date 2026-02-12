import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Allow explicit override for tests or containerized deployments
  const explicitBase = typeof process !== 'undefined'
    ? process.env.API_BASE_URL || process.env.VITE_API_BASE_URL
    : undefined;

  if (explicitBase) {
    return explicitBase.replace(/\/$/, '');
  }

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

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle 401 errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, user needs to log in again
        // Don't redirect automatically - let the app handle it
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// AUTHENTICATION API
// =============================================================================

export const loginAdmin = async (username: string, password: string) => {
  const response = await apiClient.post('/auth/login/admin', { username, password });
  return response.data;
};

export const loginEmployer = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login/employer', { email, password });
  return response.data;
};

export const logout = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// =============================================================================
// APPLICATIONS API
// =============================================================================

export const createApplication = async (filename: string, data: any) => {
  const response = await apiClient.post('/applications', { filename, data });
  return response.data;
};

export const getApplications = async () => {
  const response = await apiClient.get('/applications');
  return response.data;
};

export const updateApplication = async (filename: string, data: any) => {
  const response = await apiClient.put(`/applications/${filename}`, { data });
  return response.data;
};

export const deleteApplication = async (filename: string) => {
  const response = await apiClient.delete(`/applications/${filename}`);
  return response.data;
};

// =============================================================================
// FACT SHEETS API
// =============================================================================

export const createFactSheet = async (filename: string, data: any) => {
  const response = await apiClient.post('/fact-sheets', { filename, data });
  return response.data;
};

export const getFactSheets = async () => {
  const response = await apiClient.get('/fact-sheets');
  return response.data;
};

export const updateFactSheet = async (filename: string, data: any) => {
  const response = await apiClient.put(`/fact-sheets/${filename}`, { data });
  return response.data;
};

export const deleteFactSheet = async (filename: string) => {
  const response = await apiClient.delete(`/fact-sheets/${filename}`);
  return response.data;
};

// =============================================================================
// AI ANALYSIS API
// =============================================================================

export const saveAnalysis = async (filename: string, data: any) => {
  const response = await apiClient.post('/analysis', { filename, data });
  return response.data;
};

export const getAnalysis = async (filename: string) => {
  const response = await apiClient.get(`/analysis/${filename}`);
  return response.data;
};

export const getAllAnalyses = async () => {
  const response = await apiClient.get('/analysis');
  return response.data;
};

export const deleteAnalysis = async (filename: string) => {
  const response = await apiClient.delete(`/analysis/${filename}`);
  return response.data;
};
