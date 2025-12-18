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

  // Do not default the model; require `GEMINI_MODEL` to be set in the server env.
  const nodeModel = (typeof process !== 'undefined' && process.env)
    ? process.env.GEMINI_MODEL
    : undefined;

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
    return createFallbackAnalysis({
      riskScore: 'LOW',
      summary: "AI Analysis unavailable. Server proxy call failed or returned an error.",
      concerns: ["System configuration error."],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      factSheetSummary: "Analysis unavailable.",
      webPresenceSummary: "Search unavailable without API Key.",
      debugPrompt: 'Prompt not generated because proxy call failed on the client.',
      rawResponse: `Proxy unreachable or returned error. Last error: ${raw}. Check server logs and /__api/gemini/analyze on the backend.`
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
      debugPrompt: 'Prompt not generated because server API key is missing.',
      rawResponse: 'Server-side API key missing. Set GEMINI_API_KEY in .env.local or environment.'
    });
  }

  // Require model to be explicitly configured in the server environment.
  if (!nodeModel) {
    return createFallbackAnalysis({
      riskScore: 'LOW',
      summary: 'AI Analysis unavailable. GEMINI_MODEL is not configured on the server.',
      concerns: ['System configuration error: missing GEMINI_MODEL.'],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      factSheetSummary: 'Analysis unavailable.',
      webPresenceSummary: 'Search unavailable without model configuration.',
      debugPrompt: 'Prompt not generated because server model is missing.',
      rawResponse: 'Server-side GEMINI_MODEL missing. Set GEMINI_MODEL in .env.local or environment.'
    });
  }

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
    // SEQUENTIAL TASK EXECUTION (ONE AT A TIME)
    // ============================================
    // Task 1 executes first. Only if it succeeds do we proceed to Task 2.
    // Only if Task 2 succeeds do we proceed to Task 3.
    // ============================================

    // ============================================
    // TASK 1: Fact Sheet Analysis (ALWAYS RUNS)
    // ============================================
    console.log('=== TASK 1: Fact Sheet Analysis - STARTING ===');
    const factResp = await generateAndParse(factPrompt);
    const factText = factResp.text || '';
    const parsedFact = parseAIResponse(factText) || null;
    console.log('=== TASK 1: Fact Sheet Analysis - COMPLETE ===');

    // Initialize Task 2 & 3 variables
    let policyText = '';
    let parsedPolicy = null;
    let webText = '';
    let parsedWeb = null;

    // ============================================
    // TASK 2: Policy Analysis (RUNS ONLY IF TASK 1 SUCCEEDS)
    // ============================================
    if (parsedFact) {
      console.log('=== TASK 2: Policy Analysis - STARTING (Task 1 succeeded) ===');
      const policyInputPrompt = `
Compare the APPLICATION (compact JSON) to the INTERNAL_RECORD below and the provided POLICY_TEXT. Return a compact JSON object (single line) with { "policyViolations": [{"field": string, "value": string, "policy": string|null, "clause": string|null, "recommendation": string|null}], "certificationAnalysis": { "totalWorkers": number|null, "certifiedWorkers": number|null, "complianceRatio": number|null, "meetsRequirement": boolean|null }, "recommendation": string, "summary": string }.
APPLICATION: ${applicationJsonCompact}
INTERNAL_RECORD: ${factSheetContext}
POLICY_TEXT: ${policiesSnippet}
`;
      const policyResp = await generateAndParse(policyInputPrompt);
      policyText = policyResp.text || '';
      parsedPolicy = parseAIResponse(policyText) || null;
      console.log('=== TASK 2: Policy Analysis - COMPLETE ===');

      // ============================================
      // TASK 3: Web Search (RUNS ONLY IF TASK 2 SUCCEEDS)
      // ============================================
      if (parsedPolicy) {
        console.log('=== TASK 3: Web Search - STARTING (Task 2 succeeded) ===');
        const webPrompt = `
Search the public web for evidence about the company. Return a compact JSON object (single line) with { "webPresenceValidation": { "companyFound": boolean, "relevantIndustry": boolean, "searchSummary": string }, "sources": [{ "title": string, "uri": string }] }. Use the company identifiers: ${application.companyName}, address: ${application.address}, tradeName: ${application.wizardData?.firmTradeName || ''}.
`;
        const webResp = await generateAndParse(webPrompt);
        webText = webResp.text || '';
        parsedWeb = parseAIResponse(webText) || null;
        console.log('=== TASK 3: Web Search - COMPLETE ===');
      } else {
        console.log('=== TASK 3: Web Search - SKIPPED (Task 2 failed) ===');
      }
    } else {
      console.log('=== TASK 2 & TASK 3: SKIPPED (Task 1 failed) ===');
    }

    // If fact sheet analysis failed to produce any parseable JSON, return fallback
    if (!parsedFact) {
      try {
        const fs = await import('fs');
        const pathMod = await import('path');
        const dir = pathMod.resolve(process.cwd(), 'tmp', 'ai-failures');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const ts = Date.now();
        try { fs.writeFileSync(pathMod.join(dir, `fact-raw-${ts}.txt`), `FACT:\n${factText}`, 'utf8'); } catch (e) { }
        try { fs.writeFileSync(pathMod.join(dir, `fact-response-${ts}.json`), JSON.stringify({ factResp: factResp.response }, null, 2), 'utf8'); } catch (e) { }
      } catch (e) { /* ignore */ }

      return createFallbackAnalysis({
        riskScore: 'MEDIUM',
        summary: 'AI returned unparsable response for fact sheet analysis. See debug for raw output.',
        concerns: ['AI response parsing failed for fact sheet analysis.'],
        recommendation: 'REQUEST_INFO',
        debugPrompt: factPrompt,
        rawResponse: factText
      });
    }

    // Merge best-effort results into a single result object
    let merged: any = {};
    merged.internalRecordValidation = parsedFact?.internalRecordValidation || parsedFact?.internalRecordValidation || { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] };
    merged.certificationAnalysis = parsedPolicy?.certificationAnalysis || { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null };
    merged.policyViolations = parsedPolicy?.policyViolations || [];
    merged.recommendation = parsedPolicy?.recommendation || 'MANUAL_REVIEW_REQUIRED';
    merged.summary = parsedPolicy?.summary || parsedFact?.summary || 'Partial analysis — manual review recommended.';
    merged.webPresenceValidation = parsedWeb?.webPresenceValidation || { companyFound: false, relevantIndustry: false, searchSummary: '' };
    merged.sources = parsedWeb?.sources || parsedPolicy?.sources || [];

    // Attach per-step debug (FACT STEP ONLY)
    // Note: Steps 2 (policy) and 3 (web) are disabled, so only fact debug is included
    const perStepDebug = {
      fact: { prompt: factPrompt, raw: factText, finishReason: factResp.finishReason, parsed: parsedFact || null, startedAt: factResp.startedAt, finishedAt: factResp.finishedAt, durationMs: factResp.durationMs }
    };

    // Use merged as `result` for downstream normalization/validation
    var response = { candidates: [{ groundingMetadata: { groundingChunks: [] } }] } as any; // placeholder for grounding
    var text = policyText || factText || webText;
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
          debugPrompt: prompt,
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
