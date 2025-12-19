import { LicenseApplication, AIAnalysisResult, EmployerFactSheet } from "../types";

const CONFIG = {
  DEFAULT_TIMEOUT_MS: 15000,
  DEFAULT_MODEL: 'gemini-2.5-flash-lite',
  CERTIFICATION_REQUIREMENT: 1.0, // 100%
  OVERDUE_BALANCE_THRESHOLD: 500,
  INSURANCE_EXPIRY_THRESHOLD_MONTHS: 6,
  MAX_OUTPUT_TOKENS: 1024,
  // Set temperature to 0 for deterministic JSON output by default
  TEMPERATURE: 0.0,
} as const;
// Agent enable flags (server-side). Set GEMINI_ENABLE_POLICY and GEMINI_ENABLE_WEB to 'true' to enable.
const ENABLE_POLICY = (typeof process !== 'undefined' && process.env && process.env.GEMINI_ENABLE_POLICY === 'true') || false;
const ENABLE_WEB = (typeof process !== 'undefined' && process.env && process.env.GEMINI_ENABLE_WEB === 'true') || false;
// Load Ajv dynamically so TypeScript doesn't require installed types at build
// time in developer environments where the package may not yet be installed.
let validateAiAnalysis: (data: any) => boolean;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AjvMod = (await import('ajv')).default || (await import('ajv'));
  const ajv = new (AjvMod as any)({ allErrors: true, strict: false });
  const aiAnalysisSchema = {
  type: 'object',
  properties: {
    riskScore: { type: 'string', enum: ['LOW','MEDIUM','HIGH','INVALID'] },
    isTestAccount: { type: 'boolean' },
    summary: { type: 'string' },
    internalRecordValidation: {
      type: 'object',
      properties: {
        recordFound: { type: 'boolean' }
      },
      required: ['recordFound']
    },
    geographicValidation: { type: 'object' },
    webPresenceValidation: { type: 'object' },
    certificationAnalysis: { type: 'object' },
    concerns: { type: 'array' },
    policyViolations: { type: 'array' },
    recommendation: { type: 'string' },
    requiredActions: { type: 'array' },
    sources: { type: 'array' },
    debug: { type: 'object' }
  },
  required: ['riskScore','summary','internalRecordValidation','geographicValidation','webPresenceValidation','certificationAnalysis','concerns','policyViolations','recommendation','requiredActions']
  };
  validateAiAnalysis = ajv.compile(aiAnalysisSchema);
} catch (e) {
  // If Ajv isn't installed or import fails, provide a passthrough validator
  console.warn('AJV not available; skipping schema validation for AI outputs.');
  validateAiAnalysis = (_: any) => true;
}

// Basic input validation for incoming requests
function validateApplicationInput(application: LicenseApplication): void {
  if (!application) throw new Error('Application is required');
  if (!application.companyName || !application.companyName.trim()) throw new Error('Company name is required');
  if (!application.address || !application.address.trim()) throw new Error('Address is required');
}

// Type guard for AIAnalysisResult to provide runtime checks
function isValidAIAnalysisResult(obj: any): obj is AIAnalysisResult {
  if (!obj || typeof obj !== 'object') return false;
  const allowed = ['LOW', 'MEDIUM', 'HIGH', 'INVALID'];
  if (!('riskScore' in obj) || !allowed.includes(obj.riskScore)) return false;
  if (typeof obj.summary !== 'string') return false;
  if (!obj.internalRecordValidation || typeof obj.internalRecordValidation !== 'object') return false;
  if (!obj.geographicValidation || typeof obj.geographicValidation !== 'object') return false;
  if (!obj.webPresenceValidation || typeof obj.webPresenceValidation !== 'object') return false;
  return true;
}

export const analyzeApplication = async (
  application: LicenseApplication, 
  factSheet?: EmployerFactSheet
): Promise<AIAnalysisResult> => {
  // Validate required input early to fail fast and provide clear errors
  validateApplicationInput(application);
  // Key resolution: use only the server environment variable `GEMINI_API_KEY`.
  // This centralizes key management to a single location (e.g. .env.local).
  const nodeKey = (typeof process !== 'undefined' && process.env)
    ? process.env.GEMINI_API_KEY
    : undefined;

  // Resolve model from environment, falling back to CONFIG.DEFAULT_MODEL
  // if GEMINI_MODEL is not set. Log a warning so operators can configure.
  let nodeModel = (typeof process !== 'undefined' && process.env)
    ? process.env.GEMINI_MODEL
    : undefined;
  if (!nodeModel) {
    try { console.warn('GEMINI_MODEL not set; falling back to default model', CONFIG.DEFAULT_MODEL); } catch (e) {}
    nodeModel = CONFIG.DEFAULT_MODEL;
  }

  const resolvedKey = nodeKey;

  // Debug: indicate whether the server env provided a key.
  try {
    console.debug('geminiService: key presence', {
      hasNodeKey: !!nodeKey,
      resolvedFrom: nodeKey ? 'node' : 'none'
    });
  } catch (e) {
    // ignore logging errors
  }

  // Centralized fallback factory to avoid repeating near-identical objects.
  function createFallbackAnalysis(opts: {
    riskScore?: 'LOW' | 'MEDIUM' | 'HIGH' | 'INVALID',
    isTestAccount?: boolean,
    summary?: string,
    concerns?: string[],
    recommendation?: string,
    factSheetSummary?: string,
    webPresenceSummary?: string,
    debugPrompt?: string,
    rawResponse?: string,
    extraDebug?: any,
    preserve?: any
  }): AIAnalysisResult {
    const {
      riskScore = 'MEDIUM',
      isTestAccount = false,
      summary = 'AI returned an unexpected response. Manual review required.',
      concerns = ['AI response parsing failed.'],
      recommendation = 'MANUAL_REVIEW_REQUIRED',
      factSheetSummary = 'Analysis unavailable.',
      webPresenceSummary = 'Analysis unavailable.',
      debugPrompt = '',
      rawResponse = '',
      extraDebug = undefined,
      preserve = {}
    } = opts || {};

    const base: AIAnalysisResult = {
      riskScore,
      isTestAccount,
      summary,
      internalRecordValidation: preserve.internalRecordValidation || { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
      geographicValidation: preserve.geographicValidation || { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
      webPresenceValidation: preserve.webPresenceValidation || { companyFound: false, relevantIndustry: false, searchSummary: '' },
      certificationAnalysis: preserve.certificationAnalysis || { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
      concerns,
      policyViolations: preserve.policyViolations || [],
      recommendation,
      requiredActions: preserve.requiredActions || [],
      sources: preserve.sources || [],
      debug: Object.assign(
        { prompt: debugPrompt || '', rawResponse: rawResponse || '' },
        extraDebug || {}
      )
    } as AIAnalysisResult;

    // Optional user-facing summaries
    (base as any).factSheetSummary = opts.factSheetSummary || factSheetSummary;
    (base as any).webPresenceSummary = opts.webPresenceSummary || webPresenceSummary;

    return base;
  }

  // If running in a browser, always call the server-side proxy endpoint
  // to avoid loading server-only model SDKs in the client bundle.
  if (typeof window !== 'undefined') {
    // Helper: attempt multiple proxy endpoints with per-request timeout
    async function tryProxyEndpoints(endpoints: string[], payload: any, timeoutMs = CONFIG.DEFAULT_TIMEOUT_MS) {
      let lastError: any = null;
      for (const endpoint of endpoints) {
        try {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const signal = controller ? controller.signal : undefined;
          const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal,
            } as any);
            const bodyText = await res.text();
            let json: any = null;
            try { json = bodyText ? JSON.parse(bodyText) : null; } catch (e) { json = null; }

            if (res.ok && json) {
              if (json && json.riskScore) return { ok: true, json };
              if (json && json.error) {
                console.error('Gemini proxy returned error payload:', json.error);
                lastError = json.error;
                continue;
              }
            } else {
              console.error('Gemini proxy responded with status', res.status, 'body:', bodyText, 'from', endpoint);
              lastError = bodyText || `Status ${res.status}`;
              continue;
            }
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
          }
        } catch (e: any) {
          if (e && e.name === 'AbortError') {
            console.error('Gemini proxy request aborted due to timeout to', endpoint);
            lastError = 'timeout';
          } else {
            console.error('Failed to call Gemini proxy at', endpoint, e);
            lastError = e;
          }
          continue;
        }
      }
      return { ok: false, lastError };
    }

    const endpoints = ['/__api/gemini/analyze', 'http://localhost:5000/__api/gemini/analyze'];
    const proxyResult = await tryProxyEndpoints(endpoints, { application, factSheet }, CONFIG.DEFAULT_TIMEOUT_MS);
    if (proxyResult.ok) return proxyResult.json as AIAnalysisResult;

    const raw = typeof proxyResult.lastError === 'string' ? proxyResult.lastError : (proxyResult.lastError && proxyResult.lastError.message) ? proxyResult.lastError.message : String(proxyResult.lastError);
    // Build a minimal fact-step prompt locally so UI can show the attempted prompt and timestamp
    const nowIso = new Date().toISOString();
    const appCompact = JSON.stringify(application);
    const factSheetContext = factSheet ? JSON.stringify(factSheet) : "NO MATCHING EMPLOYER FACT SHEET FOUND IN INTERNAL DATABASE.";
    const factPromptLocal = `ROLE: You are a Regulatory Compliance Analyst for WorkSafeBC.\n\nTASK: Validate the application against the internal Employer Fact Sheet record.\n\nINTERNAL_RECORD (Fact Sheet):\n${factSheetContext}\n\nAPPLICATION_DATA:\n${appCompact}\n\nOUTPUT (JSON): Return a JSON object with keys riskScore, summary, internalRecordValidation, concerns, recommendation.`;

    return createFallbackAnalysis({
      riskScore: 'LOW',
      summary: "AI Analysis unavailable. Server proxy call failed or returned an error.",
      concerns: ["System configuration error."],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      factSheetSummary: "Analysis unavailable.",
      webPresenceSummary: "Search unavailable without API Key.",
      debugPrompt: factPromptLocal,
      rawResponse: `Proxy unreachable or returned error. Last error: ${raw}. Check server logs and /__api/gemini/analyze on the backend.`,
      extraDebug: {
        perStepDebug: {
          fact: {
            prompt: factPromptLocal,
            raw: `Proxy Error: ${raw}`,
            parsed: null,
            startedAt: nowIso,
            finishedAt: nowIso,
            durationMs: 0,
            status: 'failed'
          }
        }
      }
    });
  }

  // If we are here, we are running server-side (Node). Ensure we have a nodeKey
  if (!nodeKey) {
    return createFallbackAnalysis({
      riskScore: 'LOW',
      summary: "AI Analysis unavailable. API Key is missing in the server environment.",
      concerns: ["System configuration error."],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      factSheetSummary: "Analysis unavailable.",
      webPresenceSummary: "Search unavailable without API Key.",
      debugPrompt: 'Server-side GEMINI_API_KEY missing. Set GEMINI_API_KEY in .env.local or environment and restart the dev server.',
      rawResponse: 'Server-side GEMINI_API_KEY missing. Set GEMINI_API_KEY in .env.local or environment and restart the dev server.'
    });
  }

  // If GEMINI_MODEL was not explicitly set we now defaulted to CONFIG.DEFAULT_MODEL.
  // This prevents hard failures in developer environments while still logging a warning above.

  const companyInfo = `${application.companyName} located at ${application.address}`;
  const tradeName = application.wizardData?.firmTradeName ? `(also known as ${application.wizardData.firmTradeName})` : '';

  // Use compact JSON to reduce prompt token count (avoid pretty printing)
  const factSheetContext = factSheet 
    ? JSON.stringify(factSheet)
    : "NO MATCHING EMPLOYER FACT SHEET FOUND IN INTERNAL DATABASE.";
  // Fetch policy documents (server exposes /api/policies)
  async function loadPoliciesText(): Promise<string> {
    try {
      if (typeof window !== 'undefined') {
        try {
          const resp = await fetch('/api/policies');
          const body = await resp.text();
          if (!resp.ok) {
            console.warn('Policy endpoint responded with non-OK status', resp.status, body);
            return '';
          }
          try {
            const json = JSON.parse(body);
            return json.combinedText || '';
          } catch (e) {
            console.warn('Policy endpoint returned non-JSON response:', body);
            return '';
          }
        } catch (e) {
          console.warn('Failed fetching /api/policies from client:', e);
          return '';
        }
      } else {
        // Server-side: attempt to read .docx files under ./docs and extract text with mammoth
        try {
          const fs = await import('fs');
          const pathMod = await import('path');
          let mammoth: any = null;
          try { mammoth = await import('mammoth'); } catch (e) { mammoth = null; }

          const docsPath = pathMod.resolve(process.cwd(), 'docs');
          if (!fs.existsSync(docsPath)) return '';
          const files = fs.readdirSync(docsPath).filter((f: string) => f.endsWith('.docx'));
          if (!files.length) return '';
          const parts: string[] = [];
          for (const f of files) {
            const abs = pathMod.join(docsPath, f);
            try {
              const buffer = fs.readFileSync(abs);
              if (mammoth && typeof mammoth.extractRawText === 'function') {
                try {
                  const m = await mammoth.extractRawText({ buffer });
                  parts.push(`--- ${f} ---\n` + (m?.value || ''));
                } catch (e) {
                  console.warn('Failed to extract text from', f, e);
                  parts.push(`--- ${f} ---\n[Extraction failed]`);
                }
              } else {
                parts.push(`--- ${f} ---\n[Unable to extract text: mammoth not installed]`);
              }
            } catch (e) {
              console.warn('Failed reading policy file', abs, e);
            }
          }
          return parts.join('\n\n');
        } catch (e) {
          console.warn('Could not load policy documents for AI prompt (server-side):', e);
          return '';
        }
      }
    } catch (e) {
      console.warn('Unexpected error loading policies:', e);
      return '';
    }
  }

  const policiesText = await loadPoliciesText();

  // Debug: Log the factSheet and context sent to AI
  console.log('geminiService: factSheet provided:', !!factSheet);
  if (factSheet) {
    console.log('geminiService: factSheet.employerId:', factSheet.employerId);
    console.log('geminiService: factSheet.employerLegalName:', factSheet.employerLegalName);
    console.log('geminiService: factSheet.employerTradeName:', factSheet.employerTradeName);
  }
  console.log('geminiService: factSheetContext preview:', factSheetContext.substring(0, 200) + '...');

  // Serialize application compactly to shrink prompt size
  const applicationJsonCompact = JSON.stringify(application);

  // Limit the size of policy text embedded in the prompt to avoid exhausting
  // the model context window. Keep a useful prefix if policies are large.
  const MAX_POLICIES_CHARS = 15000;
  const policiesSnippet = policiesText && policiesText.length > MAX_POLICIES_CHARS
    ? policiesText.slice(0, MAX_POLICIES_CHARS) + '\n---TRUNCATED---'
    : policiesText || '';

  try {
    // Dynamically import the GenAI client only on the server to avoid bundling
    // Node modules into the client-side bundle which breaks Vite/esbuild.
    let GoogleGenAI: any = null;
    try {
      const mod = await import('@google/genai');
      GoogleGenAI = (mod as any)?.GoogleGenAI || (mod as any)?.default || mod;
    } catch (loadErr) {
      GoogleGenAI = null;
    }

    if (!GoogleGenAI) {
      throw new Error('GenAI client (@google/genai) is not available in the server environment. Please install and configure it.');
    }

    const ai = new (GoogleGenAI as any)({ apiKey: resolvedKey });

    // Helper to call the model, handle MAX_TOKENS continuation, and parse JSON
    async function generateAndParse(modelPrompt: string) {
      const startedAt = new Date();
      try {
        const resp = await ai.models.generateContent({
          model: nodeModel,
          contents: modelPrompt,
          config: { tools: [{ googleSearch: {} }], temperature: CONFIG.TEMPERATURE, maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS }
        });

        const anyResp: any = resp;
        const finish = anyResp.candidates?.[0]?.finishReason || anyResp.result?.candidates?.[0]?.finishReason;
        let text = anyResp.text || anyResp.outputText || anyResp.output?.[0]?.content || anyResp.result?.outputText || anyResp.result?.outputs?.[0]?.content?.text;
        if (!text) {
          const cand = anyResp.candidates?.[0] || anyResp.result?.candidates?.[0];
          if (cand) text = cand.text || cand.output || cand.content || cand.message?.content?.[0]?.text || cand.message?.content?.[0]?.text?.text;
        }
        if (!text && anyResp.candidates && anyResp.candidates.length) text = anyResp.candidates.map((c: any) => c.text || JSON.stringify(c)).join('\n');

        // If the model stopped due to MAX_TOKENS, attempt a single continuation
        if (finish === 'MAX_TOKENS') {
          try {
            const cont = await ai.models.generateContent({
              model: nodeModel,
              contents: 'Continue the previous JSON output. Return only the remaining JSON text to complete the object, with no explanation.',
              config: { temperature: 0.0, maxOutputTokens: 512 }
            });
            const a: any = cont;
            let contText = a.text || a.outputText || a.output?.[0]?.content || a.result?.outputText || a.result?.outputs?.[0]?.content?.text;
            if (!contText && a.candidates && a.candidates.length) contText = a.candidates.map((c: any) => c.text || JSON.stringify(c)).join('\n');
            if (contText) text = String(text || '') + '\n' + String(contText);
          } catch (e) {
            // ignore continuation failure; we'll handle parsing below
          }
        }

        const finishedAt = new Date();
        return { response: resp, text: text || '', finishReason: finish, startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), durationMs: finishedAt.getTime() - startedAt.getTime() };
      } catch (err) {
        const finishedAt = new Date();
        return { response: err, text: '', finishReason: undefined, startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), durationMs: finishedAt.getTime() - startedAt.getTime() };
      }
    }

    // ============================================================
    // SINGLE STEP: Fact Sheet Validation Only
    // (Policy Violations and Web Search are disabled for debugging)
    // ============================================================
    const factPrompt = `
ROLE: You are a Regulatory Compliance Analyst for WorkSafeBC.

TASK: Validate the application against the internal Employer Fact Sheet record.

INTERNAL_RECORD (Fact Sheet):
${factSheetContext}

APPLICATION_DATA:
${applicationJsonCompact}

ANALYSIS REQUIREMENTS:
1. Check if the applicant's firm exists in the internal database
2. If found, verify the account number matches and check for financial non-compliance (overdue balances)
3. If not found, flag as high-risk unknown entity
4. Identify any data discrepancies between application and fact sheet
5. Determine overall record validation status

OUTPUT (Strict JSON on single line):
Return ONLY a JSON object with NO explanatory text:
{
  "riskScore": "LOW" | "MEDIUM" | "HIGH",
  "isTestAccount": boolean,
  "summary": "Brief assessment of fact sheet validation",
  "internalRecordValidation": {
    "recordFound": boolean,
    "accountNumber": string | null,
    "overdueBalance": number | null,
    "statusMatch": boolean | null,
    "concerns": string[]
  },
  "concerns": ["List of identified concerns..."],
  "recommendation": "APPROVE" | "REJECT" | "REQUEST_INFO"
}
`;

    // ============================================
    // PARALLEL AGENT EXECUTION (THREE INDEPENDENT AGENTS)
    // ============================================
    // All three agents run concurrently for faster results.
    // Each agent can succeed or fail independently.
    // ============================================

    console.log('=== LAUNCHING THREE PARALLEL AI AGENTS ===');

    // Define Agent 2: Policy Compliance Analyzer
    const policyInputPrompt = `
ROLE: You are a Policy Compliance Analyst for WorkSafeBC.

TASK: Analyze the application for policy violations and certification compliance.

APPLICATION: ${applicationJsonCompact}
INTERNAL_RECORD: ${factSheetContext}
POLICY_TEXT: ${policiesSnippet}

ANALYSIS REQUIREMENTS:
1. Identify any violations of WorkSafeBC asbestos licensing policies
2. Calculate certification compliance ratio (certified workers / total workers)
3. Verify compliance meets the 100% certification requirement
4. Provide specific policy citations for any violations
5. Generate actionable recommendations

OUTPUT (Strict JSON on single line):
Return ONLY a JSON object with NO explanatory text:
{
  "policyViolations": [{"field": string, "value": string, "policy": string|null, "clause": string|null, "recommendation": string|null}],
  "certificationAnalysis": {
    "totalWorkers": number|null,
    "certifiedWorkers": number|null,
    "complianceRatio": number|null,
    "meetsRequirement": boolean|null
  },
  "recommendation": "APPROVE" | "REJECT" | "REQUEST_INFO",
  "summary": "Brief assessment of policy compliance"
}
`;

    // Define Agent 3: Web Presence Investigator
    const webPrompt = `
ROLE: You are a Web Intelligence Analyst for WorkSafeBC.

TASK: Investigate the company's public web presence and verify legitimacy.

COMPANY IDENTIFIERS:
- Name: ${application.companyName}
- Address: ${application.address}
- Trade Name: ${application.wizardData?.firmTradeName || 'N/A'}

INVESTIGATION REQUIREMENTS:
1. Search for evidence the company exists and operates in British Columbia, Canada
2. Verify the company performs asbestos abatement, demolition, or hazardous materials work
3. Check for any negative safety or compliance reviews
4. Assess overall web presence credibility
5. Cite specific sources found

OUTPUT (Strict JSON on single line):
Return ONLY a JSON object with NO explanatory text:
{
  "webPresenceValidation": {
    "companyFound": boolean,
    "relevantIndustry": boolean,
    "searchSummary": string
  },
  "geographicValidation": {
    "addressExistsInBC": boolean,
    "addressConflicts": string[],
    "verifiedLocation": string|null
  },
  "sources": [{"title": string, "uri": string}]
}
`;

    // Execute agents in parallel, but respect server-side enable flags so disabled agents are not called.
    const agentPromises: Array<Promise<any>> = [];
    // Agent 1: Fact (always executed)
    agentPromises.push(generateAndParse(factPrompt).catch(err => ({ response: err, text: '', finishReason: 'ERROR', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 })));
    // Agent 2: Policy (may be disabled)
    if (ENABLE_POLICY) {
      agentPromises.push(generateAndParse(policyInputPrompt).catch(err => ({ response: err, text: '', finishReason: 'ERROR', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 })));
    } else {
      // Insert a resolved placeholder for disabled agent
      agentPromises.push(Promise.resolve({ response: null, text: '', finishReason: 'DISABLED', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 }));
    }
    // Agent 3: Web (may be disabled)
    if (ENABLE_WEB) {
      agentPromises.push(generateAndParse(webPrompt).catch(err => ({ response: err, text: '', finishReason: 'ERROR', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 })));
    } else {
      agentPromises.push(Promise.resolve({ response: null, text: '', finishReason: 'DISABLED', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 }));
    }

    const [factResp, policyResp, webResp] = await Promise.all(agentPromises);

    console.log('=== ALL THREE AGENTS COMPLETED ===');

    // Parse results from each agent
    const factText = factResp.text || '';
    const policyText = policyResp.text || '';
    const webText = webResp.text || '';

    const parsedFact = parseAIResponse(factText) || null;
    const parsedPolicy = parseAIResponse(policyText) || null;
    const parsedWeb = parseAIResponse(webText) || null;

    console.log('Agent 1 (Fact Sheet):', parsedFact ? '✓ Success' : '✗ Failed');
    console.log('Agent 2 (Policy):', parsedPolicy ? '✓ Success' : '✗ Failed');
    console.log('Agent 3 (Web Search):', parsedWeb ? '✓ Success' : '✗ Failed');

    // Log failures for debugging
    if (!parsedFact) {
      try {
        const fs = await import('fs');
        const pathMod = await import('path');
        const dir = pathMod.resolve(process.cwd(), 'tmp', 'ai-failures');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const ts = Date.now();
        try { fs.writeFileSync(pathMod.join(dir, `agent1-fact-raw-${ts}.txt`), `FACT:\n${factText}`, 'utf8'); } catch (e) { }
        try { fs.writeFileSync(pathMod.join(dir, `agent1-fact-response-${ts}.json`), JSON.stringify({ factResp: factResp.response }, null, 2), 'utf8'); } catch (e) { }
      } catch (e) { /* ignore */ }
    }

    if (!parsedPolicy) {
      try {
        const fs = await import('fs');
        const pathMod = await import('path');
        const dir = pathMod.resolve(process.cwd(), 'tmp', 'ai-failures');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const ts = Date.now();
        try { fs.writeFileSync(pathMod.join(dir, `agent2-policy-raw-${ts}.txt`), `POLICY:\n${policyText}`, 'utf8'); } catch (e) { }
        try { fs.writeFileSync(pathMod.join(dir, `agent2-policy-response-${ts}.json`), JSON.stringify({ policyResp: policyResp.response }, null, 2), 'utf8'); } catch (e) { }
      } catch (e) { /* ignore */ }
    }

    if (!parsedWeb) {
      try {
        const fs = await import('fs');
        const pathMod = await import('path');
        const dir = pathMod.resolve(process.cwd(), 'tmp', 'ai-failures');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const ts = Date.now();
        try { fs.writeFileSync(pathMod.join(dir, `agent3-web-raw-${ts}.txt`), `WEB:\n${webText}`, 'utf8'); } catch (e) { }
        try { fs.writeFileSync(pathMod.join(dir, `agent3-web-response-${ts}.json`), JSON.stringify({ webResp: webResp.response }, null, 2), 'utf8'); } catch (e) { }
      } catch (e) { /* ignore */ }
    }

    // ============================================
    // MERGE RESULTS FROM ALL THREE AGENTS
    // ============================================
    // Gracefully handle partial failures - use whatever data we successfully received
    
    let merged: any = {};
    
    // Agent 1: Fact Sheet Validation
    merged.internalRecordValidation = parsedFact?.internalRecordValidation || { 
      recordFound: false, 
      accountNumber: null, 
      overdueBalance: null, 
      statusMatch: null, 
      concerns: parsedFact ? [] : ['Fact sheet analysis failed or returned unparsable data'] 
    };
    
    // Agent 2: Policy Compliance
    merged.certificationAnalysis = parsedPolicy?.certificationAnalysis || { 
      totalWorkers: null, 
      certifiedWorkers: null, 
      complianceRatio: null, 
      meetsRequirement: null 
    };
    merged.policyViolations = parsedPolicy?.policyViolations || [];
    
    // Agent 3: Web Presence
    merged.webPresenceValidation = parsedWeb?.webPresenceValidation || { 
      companyFound: false, 
      relevantIndustry: false, 
      searchSummary: parsedWeb ? '' : 'Web search analysis failed or returned unparsable data' 
    };
    merged.geographicValidation = parsedWeb?.geographicValidation || {
      addressExistsInBC: false,
      addressConflicts: [],
      verifiedLocation: null
    };
    
    // Merge sources from all agents
    merged.sources = [
      ...(parsedWeb?.sources || []),
      ...(parsedPolicy?.sources || []),
      ...(parsedFact?.sources || [])
    ];
    
    // Determine overall recommendation and summary
    // Priority: Policy > Fact Sheet > Web (most critical first)
    merged.recommendation = parsedPolicy?.recommendation || parsedFact?.recommendation || 'MANUAL_REVIEW_REQUIRED';
    
    // Create comprehensive summary mentioning which agents succeeded
    const agentStatuses = [];
    if (parsedFact) agentStatuses.push('internal record validation');
    if (parsedPolicy) agentStatuses.push('policy compliance');
    if (parsedWeb) agentStatuses.push('web presence verification');
    
    const failedAgents = [];
    if (!parsedFact) failedAgents.push('internal record');
    if (!parsedPolicy) failedAgents.push('policy analysis');
    if (!parsedWeb) failedAgents.push('web search');
    
    if (failedAgents.length === 3) {
      merged.summary = 'All AI agents failed to produce parsable results. Manual review required.';
    } else if (failedAgents.length > 0) {
      merged.summary = `Partial analysis completed (${agentStatuses.join(', ')}). Failed: ${failedAgents.join(', ')}. Manual review recommended.`;
    } else {
      merged.summary = parsedPolicy?.summary || parsedFact?.summary || parsedWeb?.searchSummary || 'Analysis completed successfully.';
    }
    
    // Calculate overall risk score (use highest risk from any agent)
    const riskScores = [
      parsedFact?.riskScore,
      parsedPolicy?.riskScore,
      parsedWeb?.riskScore
    ].filter(Boolean);
    
    const riskPriority: Record<string, number> = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INVALID': 0 };
    merged.riskScore = riskScores.reduce((highest, current) => 
      (riskPriority[current] || 0) > (riskPriority[highest] || 0) ? current : highest,
      failedAgents.length > 0 ? 'MEDIUM' : 'LOW'
    );
    
    // Collect concerns from all agents
    merged.concerns = [
      ...(parsedFact?.concerns || []),
      ...(parsedPolicy?.concerns || []),
      ...(parsedWeb?.concerns || [])
    ];
    
    // Add warnings for failed agents
    if (failedAgents.length > 0) {
      merged.concerns.push(`Warning: The following analyses failed: ${failedAgents.join(', ')}`);
    }
    
    // Collect required actions from all agents
    merged.requiredActions = [
      ...(parsedFact?.requiredActions || []),
      ...(parsedPolicy?.requiredActions || []),
      ...(parsedWeb?.requiredActions || [])
    ];

    // Attach debug info from all three agents
    const perStepDebug = {
      // Friendly keys used by the UI: `fact`, `policy`, `web`
      fact: {
        prompt: factPrompt,
        raw: factText,
        finishReason: factResp.finishReason,
        parsed: parsedFact || null,
        startedAt: factResp.startedAt,
        finishedAt: factResp.finishedAt,
        durationMs: factResp.durationMs,
        status: factResp.finishReason === 'DISABLED' ? 'disabled' : (parsedFact ? 'success' : 'failed')
      },
      policy: {
        raw: policyText,
        finishReason: policyResp.finishReason,
        parsed: parsedPolicy || null,
        prompt: policyInputPrompt,
        startedAt: policyResp.startedAt,
        finishedAt: policyResp.finishedAt,
        durationMs: policyResp.durationMs,
        status: policyResp.finishReason === 'DISABLED' ? 'disabled' : (parsedPolicy ? 'success' : 'failed')
      },
      web: {
        prompt: webPrompt,
        raw: webText,
        finishReason: webResp.finishReason,
        parsed: parsedWeb || null,
        startedAt: webResp.startedAt,
        finishedAt: webResp.finishedAt,
        durationMs: webResp.durationMs,
        status: webResp.finishReason === 'DISABLED' ? 'disabled' : (parsedWeb ? 'success' : 'failed')
      },
      // Backwards-compatible agent-specific keys
      agent1_factSheet: null,
      agent2_policy: null,
      agent3_webSearch: null,
      totalDuration: Math.max(factResp.durationMs || 0, policyResp.durationMs || 0, webResp.durationMs || 0),
      executionMode: 'parallel'
    } as any;

    // Preserve legacy keys for compatibility with older UI shapes
    perStepDebug.agent1_factSheet = perStepDebug.fact;
    perStepDebug.agent2_policy = perStepDebug.policy;
    perStepDebug.agent3_webSearch = perStepDebug.web;

    // Use merged as `result` for downstream normalization/validation
    var response = { candidates: [{ groundingMetadata: { groundingChunks: [] } }] } as any; // placeholder for grounding
    var text = [factText, policyText, webText].filter(Boolean).join('\n---\n');
    
      // JSON parsing/extraction refactor: modular strategies for clarity and testability
      function extractFirstJson(input: string): string | null {
        const start = input.indexOf('{');
        if (start === -1) return null;
        let inString = false;
        let escape = false;
        let depth = 0;
        for (let i = start; i < input.length; i++) {
          const ch = input[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (ch === '\\') {
            escape = true;
            continue;
          }
          if (ch === '"' || ch === "'") {
            inString = !inString;
            continue;
          }
          if (inString) continue;
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              return input.substring(start, i + 1);
            }
          }
        }
        return null;
      }

      function sanitizeForAttempt(s: string): string {
        return s
          .replace(/```(?:json)?/g, '')
          .replace(/\r/g, '')
          .replace(/[“”]/g, '"')
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/}\s*\{/g, '}, {')
          .replace(/}\s*"/g, '}, "')
          .replace(/\]\s*\{/g, '], {')
          .replace(/}\s*\]/g, '}]')
          .replace(/\]\s*"/g, '], "');
      }

      function parseCleanJSON(raw: string) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return null;
        }
      }

      function parseExtractedJSON(raw: string) {
        const pre = (raw || '').replace(/```(?:json)?\s*/g, '');
        const first = extractFirstJson(pre);
        if (!first) return null;
        return parseCleanJSON(first) || null;
      }

      function parseWithRepair(raw: string) {
        try {
          let candidate = (raw || '').replace(/```(?:json)?/g, '');
          candidate = sanitizeForAttempt(candidate);
          // Iteratively try truncating at last '}' if parse fails
          for (let attempt = 0; attempt < 5 && candidate.length > 0; attempt++) {
            try {
              return JSON.parse(candidate);
            } catch (e) {
              const lastClose = candidate.lastIndexOf('}');
              if (lastClose <= 0) break;
              candidate = candidate.substring(0, lastClose + 1);
              candidate = candidate.replace(/,\s*([}\]])/g, '$1');
            }
          }
        } catch (e) {
          // fall through
        }
        return null;
      }

      function parseLargestMatch(raw: string) {
        const all = (raw || '').match(/\{[\s\S]*?\}/g) || [];
        all.sort((a, b) => b.length - a.length);
        for (const m of all) {
          try {
            const sanitized = sanitizeForAttempt(m);
            const p = JSON.parse(sanitized);
            return p;
          } catch (e) {
            // continue
          }
        }
        return null;
      }

      function parseAIResponse(rawText: string) {
        const strategies = [parseCleanJSON, parseExtractedJSON, parseWithRepair, parseLargestMatch];
        for (const s of strategies) {
          try {
            const r = s(rawText);
            if (r) return r;
          } catch (e) {
            console.warn('parse strategy error', e);
          }
        }
        return null;
      }

      // Run strategies
      let result: AIAnalysisResult | null = null;
      const parsedCandidate = parseAIResponse(text || '');
      if (!parsedCandidate) {
        console.error('All JSON parsing strategies failed. Raw response:', text);
        // Attempt to persist the raw response + full SDK response for offline inspection
        try {
          const fs = await import('fs');
          const pathMod = await import('path');
          const dir = pathMod.resolve(process.cwd(), 'tmp', 'ai-failures');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const ts = Date.now();
          try { fs.writeFileSync(pathMod.join(dir, `raw-${ts}.txt`), String(text || ''), 'utf8'); } catch (e) { /* ignore */ }
          try { fs.writeFileSync(pathMod.join(dir, `response-${ts}.json`), JSON.stringify(response || {}, null, 2), 'utf8'); } catch (e) { /* ignore */ }
          console.error('Wrote unparsable AI response files to', dir);
        } catch (e) {
          console.error('Failed writing AI failure debug files', e);
        }

        return createFallbackAnalysis({
          riskScore: 'MEDIUM',
          summary: 'AI returned an unparsable response. See debug for raw output.',
          concerns: ['AI response parsing failed.'],
          recommendation: 'REQUEST_INFO',
          debugPrompt: factPrompt,
          rawResponse: text,
          extraDebug: { perStepDebug }
        });
      }

      // Normalize and coerce fields
      try {
        const parsed = parsedCandidate as any;
        parsed.isTestAccount = !!parsed.isTestAccount;
        parsed.internalRecordValidation = parsed.internalRecordValidation || { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] };
        parsed.geographicValidation = parsed.geographicValidation || { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null };
        parsed.webPresenceValidation = parsed.webPresenceValidation || { companyFound: false, relevantIndustry: false, searchSummary: '' };
        parsed.certificationAnalysis = parsed.certificationAnalysis || { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null };
        parsed.concerns = parsed.concerns || [];
        parsed.policyViolations = parsed.policyViolations || [];
        parsed.requiredActions = parsed.requiredActions || [];
        parsed.sources = parsed.sources || [];
        result = parsed as AIAnalysisResult;
      } catch (e) {
        console.error('Normalization after parse failed', e);
        // Persist the failure details for offline debugging
        try {
          const fs = await import('fs');
          const pathMod = await import('path');
          const dir = pathMod.resolve(process.cwd(), 'tmp', 'ai-failures');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const ts = Date.now();
          try { fs.writeFileSync(pathMod.join(dir, `normalize-error-${ts}.txt`), String(text || ''), 'utf8'); } catch (e) { /* ignore */ }
          try { fs.writeFileSync(pathMod.join(dir, `normalize-response-${ts}.json`), JSON.stringify(response || {}, null, 2), 'utf8'); } catch (e) { /* ignore */ }
          console.error('Wrote normalization-failure debug files to', dir);
        } catch (werr) {
          console.error('Failed writing normalization debug files', werr);
        }

        return createFallbackAnalysis({
          riskScore: 'MEDIUM',
          summary: 'AI returned an unparsable response. See debug for raw output.',
          concerns: ['AI response parsing failed.'],
          recommendation: 'REQUEST_INFO',
          debugPrompt: factPrompt,
          rawResponse: text
        });
      }

      // Ensure required top-level fields exist with safe defaults before schema validation
      (function ensureRequiredTopLevel(obj: any) {
        try {
          if (!obj) return;
          const allowedRisk = ['LOW', 'MEDIUM', 'HIGH', 'INVALID'];
          if (!obj.riskScore || !allowedRisk.includes(obj.riskScore)) obj.riskScore = 'MEDIUM';
          if (!obj.summary || typeof obj.summary !== 'string') obj.summary = 'Partial AI output — manual review recommended.';
          if (!obj.recommendation || typeof obj.recommendation !== 'string') obj.recommendation = 'MANUAL_REVIEW_REQUIRED';
          obj.concerns = obj.concerns || [];
          obj.requiredActions = obj.requiredActions || [];
          obj.policyViolations = obj.policyViolations || [];
          obj.sources = obj.sources || [];
        } catch (e) {
          // ignore
        }
      })(result as any);

    // Validate against the strict schema. If validation fails, return a
    // safe fallback and include AJV errors in `debug` for inspection.
    try {
      const valid = validateAiAnalysis(result as any);
      if (!valid) {
        const validationErrors = (validateAiAnalysis as any).errors;
        console.error('AI output failed schema validation:', validationErrors);
        // Synthesize a valid AIAnalysisResult by preserving any useful fields
        // and filling missing required properties with safe defaults so callers
        // receive a predictable structure.
        return createFallbackAnalysis({
          riskScore: (result && (result as any).riskScore) || 'MEDIUM',
          isTestAccount: !!result?.isTestAccount,
          summary: (result && (result as any).summary) || 'Partial AI output — manual review required.',
          concerns: result?.concerns || ['AI output failed schema validation.'],
          recommendation: 'MANUAL_REVIEW_REQUIRED',
          debugPrompt: factPrompt,
          rawResponse: factText,
          extraDebug: { validationErrors, perStepDebug },
          // Preserve best-effort fields so UI can display any recovered data
          preserve: {
            internalRecordValidation: result?.internalRecordValidation,
            geographicValidation: result?.geographicValidation,
            webPresenceValidation: result?.webPresenceValidation,
            certificationAnalysis: result?.certificationAnalysis,
            policyViolations: result?.policyViolations,
            requiredActions: result?.requiredActions,
            sources: result?.sources
          }
        });
      }
    } catch (e) {
      console.warn('Schema validation threw error', e);
    }

    // Extract Grounding Metadata (Sources)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
      .filter((s: any) => s !== null) as { title: string; uri: string }[];

    // Add sources and debug info to the result object (include per-step debug)
    const executionTimestamp = new Date().toISOString();
    return {
      ...result,
      sources,
      executedAt: executionTimestamp,
      debug: Object.assign(
        {
          prompt: factPrompt,
          rawResponse: text,
          executedAt: executionTimestamp
        },
        perStepDebug ? { perStepDebug } : {}
      )
    };

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    const executionTimestamp = new Date().toISOString();
    return {
      riskScore: 'MEDIUM',
      isTestAccount: false,
      summary: "Failed to generate AI analysis due to a technical error.",
      internalRecordValidation: { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
      geographicValidation: { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
      webPresenceValidation: { companyFound: false, relevantIndustry: false, searchSummary: '' },
      certificationAnalysis: { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
      concerns: ["System error during processing. Please try again or verify API Key."],
      policyViolations: [],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      requiredActions: [],
      factSheetSummary: "Comparison unavailable due to error.",
      webPresenceSummary: "Analysis failed.",
      sources: [],
      executedAt: executionTimestamp,
      debug: {
        prompt: factPrompt,
        rawResponse: error instanceof Error ? error.message : "Unknown error",
        executedAt: executionTimestamp
      }
    } as AIAnalysisResult;
  }
};
