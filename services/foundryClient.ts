import axios from 'axios';

/**
 * Client for application analysis via Azure AI Foundry Agents
 * Routes requests to /__api/foundry/analyze which uses Foundry agents
 */
export const analyzeApplicationServer = async (application: any, factSheet?: any) => {
  try {
    const resp = await axios.post('/__api/foundry/analyze', { application, factSheet });
    return resp.data;
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || String(err);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};
