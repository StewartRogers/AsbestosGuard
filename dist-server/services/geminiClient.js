import axios from 'axios';
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
