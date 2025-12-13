import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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