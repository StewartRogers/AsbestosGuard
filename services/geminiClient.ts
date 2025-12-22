import axios from 'axios';

export const analyzeApplicationServer = async (application: any, factSheet?: any) => {
  try {
    const resp = await axios.post('/__api/gemini/analyze', { application, factSheet });
    return resp.data;
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || String(err);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};
