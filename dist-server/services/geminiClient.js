import axios from 'axios';
/**
 * Client for application analysis
 *
 * When running with Foundry Agents (.env.local contains AZURE_AI_FOUNDRY_PROJECT_ENDPOINT):
 *   - Sends requests to the /__api/gemini/analyze endpoint which routes to Foundry agents
 *
 * When running with Gemini (API_KEY, GEMINI_API_KEY set):
 *   - Routes through /__api/gemini/analyze endpoint which uses Gemini
 */
export const analyzeApplicationServer = async (application, factSheet) => {
    try {
        const resp = await axios.post('/__api/gemini/analyze', { application, factSheet });
        return resp.data;
    }
    catch (err) {
        const msg = err?.response?.data || err?.message || String(err);
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
};
