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

                  // Delegate to server-side analyzeApplication to ensure dev-mode respects
                  // the same per-agent prompts and enable flags as production.
                  try {
                    const svcPath = path.resolve(process.cwd(), 'services', 'geminiService');
                    let svc: any = null;
                    try { svc = await import(svcPath); } catch (e) {
                      // Fallback to trying with .ts extension for some environments
                      svc = await import(svcPath + '.ts');
                    }
                    if (!svc || typeof svc.analyzeApplication !== 'function') {
                      throw new Error('analyzeApplication not found in services/geminiService');
                    }
                    const result = await svc.analyzeApplication(application, factSheet);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(result));
                    return;
                  } catch (e: any) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: String(e?.message || e) }));
                    return;
                  }
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
