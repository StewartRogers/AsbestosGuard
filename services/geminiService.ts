import { LicenseApplication, AIAnalysisResult, EmployerFactSheet } from "../types";
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

export const analyzeApplication = async (
  application: LicenseApplication, 
  factSheet?: EmployerFactSheet
): Promise<AIAnalysisResult> => {
  // Support multiple runtime environments:
  // - Node/server: `process.env.API_KEY`
  // - Vite/browser dev: `import.meta.env.VITE_API_KEY` (use for local dev only)
  const nodeKey = (typeof process !== 'undefined' && process.env)
    ? (process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY)
    : undefined;

  const nodeModel = (typeof process !== 'undefined' && process.env)
    ? (process.env.GEMINI_MODEL || process.env.MODEL || 'gemini-2.5-flash-lite')
    : 'gemini-2.5-flash-lite';

  // Safely attempt to read Vite's `import.meta.env.VITE_API_KEY`.
  // Avoid using `typeof import` which is a syntax error for the bundler.
  let viteKey: string | undefined = undefined;
  try {
    viteKey = (import.meta as any)?.env?.VITE_API_KEY as string | undefined;
  } catch (e) {
    viteKey = undefined;
  }

  const apiKey = nodeKey || viteKey;
  // If no server or Vite key, allow a localStorage fallback for quick local testing
  // (useful when you don't want to restart the dev server). This is INSECURE
  // and intended only for local testing — do NOT use in production.
  let localStorageKey: string | null = null;
  if (!apiKey && typeof window !== 'undefined' && window.localStorage) {
    try {
      // Support either `VITE_API_KEY` or a more generic `GEMINI_API_KEY` stored locally
      localStorageKey = window.localStorage.getItem('VITE_API_KEY') || window.localStorage.getItem('GEMINI_API_KEY');
    } catch (e) {
      localStorageKey = null;
    }
  }

  const resolvedKey = nodeKey || viteKey || (localStorageKey ?? undefined);

  // Debug: indicate which env source (if any) supplied the key.
  // Mask actual values — only show presence to avoid leaking secrets in logs.
  try {
    console.debug('geminiService: key presence', {
      hasNodeKey: !!nodeKey,
      hasViteKey: !!viteKey,
      hasLocalStorageKey: !!localStorageKey,
      resolvedFrom: nodeKey ? 'node' : viteKey ? 'vite' : localStorageKey ? 'localStorage' : 'none'
    });
  } catch (e) {
    // ignore logging errors
  }

  // If running in a browser, always call the server-side proxy endpoint
  // to avoid loading server-only model SDKs in the client bundle.
  if (typeof window !== 'undefined') {
    const endpoints = ['/__api/gemini/analyze', 'http://localhost:5000/__api/gemini/analyze'];
    let lastError: any = null;
    // Client-side fetch timeout to avoid indefinite hanging when proxy is unreachable.
    const DEFAULT_PROXY_TIMEOUT_MS = 15000; // 15 seconds
    for (const endpoint of endpoints) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const signal = controller ? controller.signal : undefined;
        const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_PROXY_TIMEOUT_MS) : undefined;

        let res: Response;
        try {
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ application, factSheet }),
            signal,
          } as any);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }

        const bodyText = await res.text();
        let json: any = null;
        try { json = bodyText ? JSON.parse(bodyText) : null; } catch(e) { json = null; }

        if (res.ok && json) {
          if (json && json.riskScore) return json as AIAnalysisResult;
          if (json && json.error) {
            console.error('Gemini proxy returned error payload:', json.error);
            lastError = json.error;
          }
        } else {
          console.error('Gemini proxy responded with status', res.status, 'body:', bodyText, 'from', endpoint);
          lastError = bodyText || `Status ${res.status}`;
        }
      } catch (e: any) {
        // Distinguish timeout aborts from other network errors for diagnostics
        if (e && e.name === 'AbortError') {
          console.error('Gemini proxy request aborted due to timeout to', endpoint);
          lastError = 'timeout';
        } else {
          console.error('Failed to call Gemini proxy at', endpoint, e);
          lastError = e;
        }
        // try next endpoint
      }
    }

    // If we reach here, proxy call(s) failed. Return graceful fallback with debug info.
    const raw = typeof lastError === 'string' ? lastError : (lastError && lastError.message) ? lastError.message : String(lastError);
    return {
      riskScore: 'LOW',
      isTestAccount: false,
      summary: "AI Analysis unavailable. Server proxy call failed or returned an error.",
      internalRecordValidation: { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
      geographicValidation: { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
      webPresenceValidation: { companyFound: false, relevantIndustry: false, searchSummary: '' },
      certificationAnalysis: { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
      concerns: ["System configuration error."],
      policyViolations: [],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      requiredActions: [],
      factSheetSummary: "Analysis unavailable.",
      webPresenceSummary: "Search unavailable without API Key.",
      sources: [],
      debug: {
        prompt: 'Prompt not generated because proxy call failed on the client.',
        rawResponse: `Proxy unreachable or returned error. Last error: ${raw}. Check server logs and /__api/gemini/analyze on the backend.`
      }
    } as AIAnalysisResult;
  }

  // If we are here, we are running server-side (Node). Ensure we have a nodeKey
  if (!nodeKey) {
    return {
      riskScore: 'LOW',
      isTestAccount: false,
      summary: "AI Analysis unavailable. API Key is missing in the server environment.",
      internalRecordValidation: { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
      geographicValidation: { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
      webPresenceValidation: { companyFound: false, relevantIndustry: false, searchSummary: '' },
      certificationAnalysis: { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
      concerns: ["System configuration error."],
      policyViolations: [],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      requiredActions: [],
      factSheetSummary: "Analysis unavailable.",
      webPresenceSummary: "Search unavailable without API Key.",
      sources: [],
      debug: {
        prompt: 'Prompt not generated because server API key is missing.',
        rawResponse: 'Server-side API key missing. Set GEMINI_API_KEY in .env.local or environment.'
      }
    } as AIAnalysisResult;
  }

  const companyInfo = `${application.companyName} located at ${application.address}`;
  const tradeName = application.wizardData?.firmTradeName ? `(also known as ${application.wizardData.firmTradeName})` : '';

  const factSheetContext = factSheet 
    ? JSON.stringify(factSheet, null, 2)
    : "NO MATCHING EMPLOYER FACT SHEET FOUND IN INTERNAL DATABASE.";

  // Fetch policy documents (server exposes /api/policies)
  let policiesText = '';
  try {
    if (typeof window !== 'undefined') {
      const resp = await fetch('/api/policies');
      if (resp.ok) {
        try {
          const json = await resp.json();
          policiesText = json.combinedText || '';
        } catch (e) {
          const body = await resp.text();
          console.warn('Policy endpoint returned non-JSON response:', body);
        }
      } else {
        const body = await resp.text();
        console.warn('Policy endpoint responded with non-OK status', resp.status, body);
      }
    } else {
      // If running server-side with nodeKey available, attempt to read via local file path
      try {
        // Dynamically import Node-only modules to avoid ESM `require` issues
        const fs = await import('fs');
        const pathMod = await import('path');
        let mammoth: any = null;
        try { mammoth = await import('mammoth'); } catch (e) { mammoth = null; }

        const docsPath = pathMod.resolve(process.cwd(), 'docs');
        if (fs.existsSync(docsPath)) {
          const files = fs.readdirSync(docsPath).filter((f: string) => f.endsWith('.docx'));
          const parts: string[] = [];
          for (const f of files) {
            try {
              const buffer = fs.readFileSync(pathMod.join(docsPath, f));
              if (mammoth && typeof mammoth.extractRawText === 'function') {
                const m = await mammoth.extractRawText({ buffer });
                parts.push(`--- ${f} ---\n` + (m?.value || ''));
              } else {
                // If mammoth not available, just note the filename
                parts.push(`--- ${f} ---\n` + '[Unable to extract text: mammoth not installed]');
              }
            } catch (e) {
              // ignore individual file errors
            }
          }
          policiesText = parts.join('\n\n');
        }
      } catch (e) {
        // if requires fail, ignore and continue
      }
    }
  } catch (e) {
    console.warn('Could not load policy documents for AI prompt:', e);
  }

  // Debug: Log the factSheet and context sent to AI
  console.log('geminiService: factSheet provided:', !!factSheet);
  if (factSheet) {
    console.log('geminiService: factSheet.employerId:', factSheet.employerId);
    console.log('geminiService: factSheet.employerLegalName:', factSheet.employerLegalName);
    console.log('geminiService: factSheet.employerTradeName:', factSheet.employerTradeName);
  }
  console.log('geminiService: factSheetContext preview:', factSheetContext.substring(0, 200) + '...');

  const prompt = `
ROLE & CONTEXT:
You are a Regulatory Risk Analysis Engine for WorkSafeBC (Asbestos Licensing). Your goal is to assess risk, identify policy violations against WorkSafeBC licensing expectations (certification ratios, valid BC addresses, account standing), and provide a structured JSON report.

INPUT DATA:
- INTERNAL_RECORD (Employer Fact Sheet):
${factSheetContext}

- APPLICATION_DATA:
${JSON.stringify(application, null, 2)}

ANALYSIS FRAMEWORK & RULES:
1) Data Reconciliation Rules
  - Priority: 'wizardData.firmAddress' > 'address' field (wizard is more recent). If addresses conflict, flag as HIGH risk and include both values in 'geographicValidation.addressConflicts'.
  - If any field contains TEST/DEMO or fictional locations (Shelbyville, Springfield), or placeholder phone patterns (e.g., 555-0123) or account numbers starting with 99999, mark isTestAccount=true and set riskScore to 'INVALID'.

2) Risk Scoring Criteria (apply the highest triggered rule):
   - CRITICAL / INVALID: Test account indicators, discovered fabricated data, or automated detection of clearly fictional values.
   - HIGH: No internal record found OR overdueBalance > 500 OR verified non-BC address OR conflicting addresses OR enforcement actions recorded OR missing required certifications.
   - MEDIUM: Record found with minor past violations, insurance expiry < 6 months, certification ratio < 100% but not zero.
   - LOW: Record found, no overdue balance, address in BC, certification ratio meets requirement.

3) Geographic Boundaries:
  - Valid addresses must be within British Columbia, Canada. Verify that the provided address resolves to a BC location. If address is outside BC or cannot be located, set 'geographicValidation.addressExistsInBC=false'.

4) Certification Requirement:
  - All workers performing abatement must be certified. Required compliance ratio = 1.0 (100%). Calculate 'complianceRatio = certifiedWorkers / totalWorkers' and set 'meetsRequirement' accordingly.

5) Web Search Protocol (limited, document what you searched):
   1. "[Company Name] [City] BC asbestos"
   2. "[Company Name] [Address] British Columbia"
   3. "[Trade Name] asbestos removal BC"
   4. Check up to 4 queries; stop if you find authoritative evidence.
   - Timeline: Consider reviews/complaints from the past 3 years.

6) Priority Flagging (Severity):
   - CRITICAL (INVALID_APPLICATION): No internal record + fabricated data.
   - HIGH (REJECT): Overdue balance > $500, fake/non-BC address, test account, outstanding enforcement actions.
   - MEDIUM (REQUEST_INFO): Minor past violations, expiring insurance < 6 months, certification ratio issues.
   - LOW (APPROVE): Clear internal match, certifications OK, no adverse web evidence.

OUTPUT REQUIREMENTS (Strict JSON ONLY):
You MUST return ONLY a raw JSON object. Do NOT wrap it in markdown code fences (```json). Do NOT include any explanatory text before or after the JSON. The first character of your response must be { and the last character must be }.

{
  "riskScore": "LOW" | "MEDIUM" | "HIGH" | "INVALID",
  "isTestAccount": boolean,
  "summary": string,
  "internalRecordValidation": {
    "recordFound": boolean,
    "accountNumber": string | null,
    "overdueBalance": number | null,
    "statusMatch": boolean | null,
    "concerns": string[]
  },
  "geographicValidation": {
    "addressExistsInBC": boolean,
    "addressConflicts": string[],
    "verifiedLocation": string | null
  },
  "webPresenceValidation": {
    "companyFound": boolean,
    "relevantIndustry": boolean,
    "searchSummary": string
  },
  "certificationAnalysis": {
    "totalWorkers": number | null,
    "certifiedWorkers": number | null,
    "complianceRatio": number | null,
    "meetsRequirement": boolean | null
  },
  "concerns": string[],
  "policyViolations": [
    { "field": string, "value": string, "policy": string | null, "clause": string | null, "recommendation": string | null }
  ],
  "recommendation": "APPROVE" | "REJECT" | "REQUEST_INFO" | "INVALID_APPLICATION",
  "requiredActions": string[],
  "sources": [ { "title": string, "uri": string } ],
  "debug": { "prompt": string, "rawResponse": string }
}

EXTRA GUIDANCE:
- If policy text (WorkSafeBC doc content) is provided in the input, reference exact clauses in 'policyViolations.clause' when applicable.
- If no policy text is provided, apply licensing expectations described above (certification ratio, BC address, account standing) and explain which rule was used in 'concerns' and 'policyViolations.policy' fields.

EXAMPLES:
1) HIGH RISK:
   - Input: No internal record + overdueBalance 1000
   - Expected: "riskScore":"HIGH", "recommendation":"REJECT", concerns includes 'No internal record' and 'overdue balance $1000'

2) MEDIUM RISK:
   - Input: Record found, minor past violation, certification ratio 0.9
   - Expected: "riskScore":"MEDIUM", "recommendation":"REQUEST_INFO"

WEB SEARCH NOTES:
Return 'sources' as an array of {title, uri} for any web evidence you cite.

END OF INSTRUCTIONS.
`;

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

    const ai = new (GoogleGenAI as any)({ apiKey });

    const response = await ai.models.generateContent({
      model: nodeModel || 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7, // optional: control creativity
        maxOutputTokens: 1024, // optional: set max response length
      }
    });

    // The GenAI client can return the generated text under various fields
    // depending on SDK versions and wrappers. Attempt multiple extraction
    // strategies to be robust to those differences.
    let text: string | undefined = undefined;
    try {
      const anyResp: any = response;
      text = anyResp.text || anyResp.outputText || anyResp.output?.[0]?.content || anyResp.result?.outputText || anyResp.result?.outputs?.[0]?.content?.text;
      // older/newer shapes: candidates array or message/content nesting
      if (!text) {
        const cand = anyResp.candidates?.[0] || anyResp.result?.candidates?.[0];
        if (cand) {
          text = cand.text || cand.output || cand.content || cand.message?.content?.[0]?.text || cand.message?.content?.[0]?.text?.text;
        }
      }
      // fallback: sometimes grounding chunks or other fields contain useful textual representation
      if (!text && anyResp.candidates && anyResp.candidates.length) {
        text = anyResp.candidates.map((c: any) => c.text || JSON.stringify(c)).join('\n');
      }
    } catch (e) {
      console.warn('Error extracting text from AI response shape', e);
      text = undefined;
    }

    if (!text) {
      console.error('AI returned no text field; full response object:', JSON.stringify(response, null, 2));
      // Return a safe failure object rather than throwing to keep the server stable
      return {
        riskScore: 'MEDIUM',
        isTestAccount: false,
        summary: 'AI returned no content. See debug for full response.',
        internalRecordValidation: { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
        geographicValidation: { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
        webPresenceValidation: { companyFound: false, relevantIndustry: false, searchSummary: '' },
        certificationAnalysis: { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
        concerns: ['AI provider returned an empty response.'],
        policyViolations: [],
        recommendation: 'MANUAL_REVIEW_REQUIRED',
        requiredActions: [],
        sources: [],
        debug: { prompt: prompt, rawResponse: JSON.stringify(response) }
      } as AIAnalysisResult;
    }
      // Helper: extract the first top-level JSON object from noisy text.
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

      // Pre-sanitize: strip markdown fences, escape URL braces, remove duplicate JSON
      let sanitizedTextForExtract = (text || '');
      // Strip markdown code fences
      sanitizedTextForExtract = sanitizedTextForExtract.replace(/```(?:json)?\s*/g, '');
      // Escape braces in URLs to prevent them from breaking JSON structure detection
      const urlRegex = /https?:\/\/[^\s"']+/g;
      sanitizedTextForExtract = sanitizedTextForExtract.replace(urlRegex, (u) => u.replace(/\{/g, '%7B').replace(/\}/g, '%7D'));

      // Extract the FIRST complete JSON object (ignores any duplicates/nesting)
      const cleanedText = extractFirstJson(sanitizedTextForExtract);
      
      // If extraction failed, try a simple regex as fallback
      if (!cleanedText) {
        const match = sanitizedTextForExtract.match(/\{[\s\S]*\}/);
        if (!match) {
          console.error('No JSON found in AI response. Raw response:', text);
          throw new Error('No JSON found in AI response. See debug.rawResponse for details.');
        }
      }
      if (!cleanedText) {
        console.error('No JSON found in AI response. Raw response:', text);
        throw new Error('No JSON found in AI response. See debug.rawResponse for details.');
      }

      let result: AIAnalysisResult;
      try {
        // Try to parse JSON and coerce numeric fields where appropriate
        const parsed = JSON.parse(cleanedText) as any;
        // Basic normalization: ensure arrays and expected keys exist
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
      } catch (parseError) {
        console.warn('AI JSON parse failed on first candidate. Attempting recovery.', parseError?.message || parseError);
        console.debug('Extracted text (first JSON candidate):', cleanedText);
        console.debug('Full raw AI response:', text);

        // Attempt fallback recovery strategies in order of non-destructiveness:
        // 1) Try to repair the extracted JSON candidate by removing trailing commas
        //    and iteratively truncating at the last closing brace to recover a
        //    well-formed object when the model output was truncated.
        // 2) If that fails, fall back to scanning all JSON-like substrings in the
        //    raw response and parse the largest one that parses successfully.

        let recovered: any = null;
        try {
          let candidate = cleanedText || '';
          // Normalize common issues: strip markdown fences, remove CR, normalize smart quotes
          candidate = candidate.replace(/```(?:json)?/g, '');
          candidate = candidate.replace(/\r/g, '');
          candidate = candidate.replace(/[“”]/g, '"');
          // Remove obvious trailing commas before } or ] which often break JSON
          candidate = candidate.replace(/,\s*([}\]])/g, '$1');
          // Insert missing commas between adjacent object literals ("}{" -> "}, {")
          candidate = candidate.replace(/}\s*\{/g, '}, {');
          // Additional heuristics to fix missing commas or boundaries inside arrays
          candidate = candidate.replace(/}\s*"/g, '}, "');
          candidate = candidate.replace(/\]\s*\{/g, '], {');
          candidate = candidate.replace(/}\s*\]/g, '}]');
          // Insert missing comma between a closing array and the next property
          candidate = candidate.replace(/\]\s*"/g, '], "');

          // Iteratively try to parse the candidate, truncating at the last '}'
          // when parse errors (like Unterminated string / truncated output) occur.
          while (candidate.length) {
            try {
              recovered = JSON.parse(candidate);
              break;
            } catch (e) {
              const lastClose = candidate.lastIndexOf('}');
              if (lastClose <= 0) break;
              candidate = candidate.substring(0, lastClose + 1);
              candidate = candidate.replace(/,\s*([}\]])/g, '$1');
            }
          }
        } catch (e) {
          // ignore repair errors and proceed to broader extraction
        }

        // If repair-by-truncation didn't succeed, try the previous approach of
        // scanning the entire raw response for JSON-like substrings and parse
        // the largest valid one.
        if (!recovered) {
          const allMatches = (text || '').match(/\{[\s\S]*?\}/g) || [];
          allMatches.sort((a, b) => b.length - a.length);
          for (const m of allMatches) {
            try {
              // sanitize candidate before parse
              const sanitized = (m || '')
                .replace(/```(?:json)?/g, '')
                .replace(/\r/g, '')
                .replace(/[“”]/g, '"')
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/}\s*\{/g, '}, {')
                .replace(/}\s*"/g, '}, "')
                .replace(/\]\s*\{/g, '], {')
                .replace(/}\s*\]/g, '}]')
                .replace(/\]\s*"/g, '], "');
              const p = JSON.parse(sanitized);
              recovered = p;
              break;
            } catch (e) {
              // continue
            }
          }
        }

        if (recovered) {
          console.info('Recovered JSON from alternate extraction.');
          const parsed = recovered as any;
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
        } else {
          // As a last resort, return a safe failure object instead of throwing, to avoid crashing the server
          console.error('Unable to recover valid JSON from AI response. Returning fallback analysis with debug info.');
          return {
            riskScore: 'MEDIUM',
            isTestAccount: false,
            summary: 'AI returned an unparsable response. See debug for raw output.',
            internalRecordValidation: { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
            geographicValidation: { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
            webPresenceValidation: { companyFound: false, relevantIndustry: false, searchSummary: '' },
            certificationAnalysis: { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
            concerns: ['AI response parsing failed.'],
            policyViolations: [],
            recommendation: 'REQUEST_INFO',
            requiredActions: [],
            sources: [],
            debug: {
              prompt: prompt,
              rawResponse: text
            }
          } as AIAnalysisResult;
        }
      }

    // Validate against the strict schema. If validation fails, return a
    // safe fallback and include AJV errors in `debug` for inspection.
    try {
      const valid = validateAiAnalysis(result as any);
      if (!valid) {
        console.error('AI output failed schema validation:', (validateAiAnalysis as any).errors);
        return {
          riskScore: 'MEDIUM',
          isTestAccount: !!result?.isTestAccount,
          summary: 'AI returned JSON that did not match the expected schema. Manual review required.',
          internalRecordValidation: result?.internalRecordValidation || { recordFound: false, accountNumber: null, overdueBalance: null, statusMatch: null, concerns: [] },
          geographicValidation: result?.geographicValidation || { addressExistsInBC: false, addressConflicts: [], verifiedLocation: null },
          webPresenceValidation: result?.webPresenceValidation || { companyFound: false, relevantIndustry: false, searchSummary: '' },
          certificationAnalysis: result?.certificationAnalysis || { totalWorkers: null, certifiedWorkers: null, complianceRatio: null, meetsRequirement: null },
          concerns: result?.concerns || ['AI output failed schema validation.'],
          policyViolations: result?.policyViolations || [],
          recommendation: 'MANUAL_REVIEW_REQUIRED',
          requiredActions: result?.requiredActions || [],
          sources: result?.sources || [],
          debug: {
            prompt: prompt,
            rawResponse: text,
            validationErrors: (validateAiAnalysis as any).errors
          }
        } as AIAnalysisResult;
      }
    } catch (e) {
      console.warn('Schema validation threw error', e);
    }

    // Extract Grounding Metadata (Sources)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
      .filter((s: any) => s !== null) as { title: string; uri: string }[];

    // Add sources and debug info to the result object
    return {
      ...result,
      sources,
      debug: {
        prompt: prompt,
        rawResponse: text
      }
    };

  } catch (error) {
    console.error("AI Analysis Failed:", error);
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
      debug: {
        prompt: prompt, // Return the prompt even if call fails, for debugging
        rawResponse: error instanceof Error ? error.message : "Unknown error"
      }
    } as AIAnalysisResult;
  }
};
