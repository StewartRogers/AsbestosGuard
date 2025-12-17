import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Prefer explicit server-side keys (GEMINI_API_KEY or API_KEY).
    // Do NOT fall back to VITE_API_KEY; keys must be set in .env.local as GEMINI_API_KEY.
    const serverApiKey = env.GEMINI_API_KEY || env.API_KEY;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Dev-only plugin to provide a server-side proxy endpoint that uses the
        // server-side API key so the frontend doesn't need to expose it.
        {
          name: 'gemini-proxy',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              // Dev-only route to list available Gemini models for the configured key
              if (req.url === '/__api/gemini/models' && req.method === 'GET') {
                if (!serverApiKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Server API key not configured.' }));
                  return;
                }

                  try {
                    // Dynamically import the GenAI client (ESM-safe).
                    let GoogleGenAI: any = null;
                    try {
                      const mod = await import('@google/genai');
                      GoogleGenAI = (mod as any)?.GoogleGenAI || (mod as any) || null;
                    } catch (loadErr) {
                      GoogleGenAI = null;
                    }

                  if (!GoogleGenAI) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, models: { error: 'GenAI client not available in dev server' } }));
                    return;
                  }

                  const ai = new GoogleGenAI({ apiKey: serverApiKey });

                  // Probe likely client methods to retrieve available models.
                  let modelsResult: any = null;
                  const probe = ai as any;

                  if (probe.models && typeof probe.models.listModels === 'function') {
                    modelsResult = await probe.models.listModels();
                  } else if (probe.models && typeof probe.models.list === 'function') {
                    modelsResult = await probe.models.list();
                  } else if (typeof probe.listModels === 'function') {
                    modelsResult = await probe.listModels();
                  } else if (typeof probe.list === 'function') {
                    modelsResult = await probe.list();
                  } else {
                    modelsResult = { error: 'No model-listing method found on GenAI client' };
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: true, models: modelsResult }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: String(err?.message || err) }));
                }

                return;
              }

              if (req.url === '/__api/gemini/analyze' && req.method === 'POST') {
                try {
                  if (!serverApiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Server API key not configured.' }));
                    return;
                  }

                  // Read request body
                  let body = '';
                  for await (const chunk of req) body += chunk;
                  const payload = JSON.parse(body || '{}');
                  const application = payload.application;
                  const factSheet = payload.factSheet;

                  // Recreate the prompt (same logic as in services/geminiService.ts)
                  const companyInfo = `${application.companyName} located at ${application.address}`;
                  const tradeName = application.wizardData?.firmTradeName ? `(also known as ${application.wizardData.firmTradeName})` : '';
                  const factSheetContext = factSheet ? JSON.stringify(factSheet, null, 2) : "NO MATCHING EMPLOYER FACT SHEET FOUND IN INTERNAL DATABASE.";

                  const prompt = `
    You are an expert Regulatory Risk Analysis Engine for WorkSafeBC (Asbestos Licensing).
    
    You must evaluate the following Asbestos License Application against Internal Records (Fact Sheet) and Public Web Data.

    --- INPUT DATA ---
    
    1. INTERNAL RECORD (Employer Fact Sheet):
    ${factSheetContext}

    2. APPLICATION DATA:
    ${JSON.stringify(application, null, 2)}

    --- ANALYSIS TASKS ---

    Task 1: Internal Record Validation (CRITICAL)
    - **Existence Check**: If the "INTERNAL RECORD" above says "NO MATCHING EMPLOYER FACT SHEET FOUND", this is AUTOMATICALLY **HIGH RISK**. The entity is unknown to the internal system.
    - **Financial Check**: If the Fact Sheet exists, check 'overdueBalance'. If > $0, this is **HIGH RISK** (Financial Non-compliance).
    - **Status Check**: If 'activeStatus' is not 'Active', this is a risk factor.
    - **Data Match**: Compare Legal Name, Trade Name, and ID between Application and Fact Sheet.

    Task 2: Web Search & Public Profile Validation
    Use Google Search to find "${companyInfo}" ${tradeName}.
    - **Location Validation**: Does the company actually exist in **British Columbia**, Canada?
    - **Industry Validation**: Does their website/profile indicate they perform Asbestos Abatement, Demolition, or Hazardous Materials work?
    - **Reputation**: Are there recent negative reviews regarding safety or compliance?
    
    Task 3: Application Data Consistency
    - Compare 'firmWorkersCount' vs 'firmCertLevel1to4' (Certification Ratio).
    - Check 'safetyHistory' for past violations.

    --- OUTPUT ---
    
    Generate the following summaries:
    1. **Regulatory Summary**: High-level verdict on risk and compliance.
    2. **Fact Sheet Summary**: Specific comparison of the Application vs. the Internal Record (Fact Sheet). Did it match? Are there debts?
    3. **Web Presence Summary**: Professional summary of the company's public profile.

    OUTPUT FORMAT (Strict JSON):
    {
      "riskScore": "LOW" | "MEDIUM" | "HIGH",
      "summary": "Concise regulatory summary highlighting the final verdict.",
      "factSheetSummary": "Summary of the internal data match (e.g. 'Matched with Account #123. No overdue balance.'). If no match, state 'No internal record found'.",
      "webPresenceSummary": "Professional summary of the company's public profile, specifically confirming if they are a BC-based asbestos/construction firm.",
      "concerns": [
        "List specific risk factors...",
        "e.g. 'No matching Fact Sheet found'",
        "e.g. 'Outstanding balance of $500'",
        "e.g. 'Public profile does not match application details'"
      ],
      "recommendation": "Approve" | "Reject" | "Request Information"
    }
  `;

                  // Call Gemini from the dev server (server-side)
                  // Dynamically import the GenAI client for the dev server handler
                  let GoogleGenAI: any = null;
                  try {
                    const mod = await import('@google/genai');
                    GoogleGenAI = (mod as any)?.GoogleGenAI || (mod as any) || null;
                  } catch (e) {
                    GoogleGenAI = null;
                  }
                  if (!GoogleGenAI) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, models: { error: 'GenAI client not available in dev server' } }));
                    return;
                  }

                  const ai = new (GoogleGenAI as any)({ apiKey: serverApiKey });
                  const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-lite',
                    contents: prompt,
                    config: { tools: [{ googleSearch: {} }] }
                  });

                  const text = response.text;
                  // Attempt to extract JSON from the model output
                  const jsonMatch = text ? text.match(/\{[\s\S]*\}/) : null;
                  let resultObj: any = null;
                  if (jsonMatch) {
                    try { resultObj = JSON.parse(jsonMatch[0]); } catch (e) { resultObj = null; }
                  }

                  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                  const sources = groundingChunks
                    .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
                    .filter((s: any) => s !== null);

                  const out = resultObj ? { ...resultObj, sources, debug: { prompt, rawResponse: text } } : {
                    riskScore: 'MEDIUM',
                    summary: 'Failed to parse AI response.',
                    factSheetSummary: 'Unavailable',
                    webPresenceSummary: 'Unavailable',
                    concerns: ['AI did not return JSON.'],
                    recommendation: 'MANUAL_REVIEW_REQUIRED',
                    sources,
                    debug: { prompt, rawResponse: text }
                  };

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(out));
                  return;
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: String(err?.message || err) }));
                  return;
                }
              }
              return next();
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(serverApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(serverApiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
