import { GoogleGenAI } from "@google/genai";
import { LicenseApplication, AIAnalysisResult, EmployerFactSheet } from "../types";

export const analyzeApplication = async (
  application: LicenseApplication, 
  factSheet?: EmployerFactSheet
): Promise<AIAnalysisResult> => {
  // Support multiple runtime environments:
  // - Node/server: `process.env.API_KEY`
  // - Vite/browser dev: `import.meta.env.VITE_API_KEY` (use for local dev only)
  const nodeKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

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

  // Prefer server-side key (nodeKey). If running in the browser without a node key,
  // call the dev server proxy endpoint (`/__api/gemini/analyze`) which will perform
  // the model call server-side using the API key configured for Vite. This keeps
  // the key secret and avoids exposing it to the client.
  if (!nodeKey) {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/__api/gemini/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ application, factSheet })
        });

        if (res.ok) {
          const json = await res.json();
          // If the proxy returned an error structure, surface it as a friendly fallback
          if (json && json.riskScore) return json as AIAnalysisResult;
          if (json && json.error) {
            console.error('Gemini proxy error:', json.error);
          }
        } else {
          console.error('Gemini proxy responded with status', res.status);
        }
      } catch (e) {
        console.error('Failed to call Gemini proxy:', e);
      }
    }

    // If we reach here, either there is no nodeKey and proxy call failed,
    // or we're in a non-browser environment with no key. Return graceful fallback.
    return {
      riskScore: 'LOW',
      summary: "AI Analysis unavailable. API Key is missing in the environment configuration.",
      factSheetSummary: "Analysis unavailable.",
      webPresenceSummary: "Search unavailable without API Key.",
      concerns: ["System configuration error."],
      recommendation: "Manual Review Required"
    };
  }

  const companyInfo = `${application.companyName} located at ${application.address}`;
  const tradeName = application.wizardData?.firmTradeName ? `(also known as ${application.wizardData.firmTradeName})` : '';

  const factSheetContext = factSheet 
    ? JSON.stringify(factSheet, null, 2)
    : "NO MATCHING EMPLOYER FACT SHEET FOUND IN INTERNAL DATABASE.";

  // Debug: Log the factSheet and context sent to AI
  console.log('geminiService: factSheet provided:', !!factSheet);
  if (factSheet) {
    console.log('geminiService: factSheet.employerId:', factSheet.employerId);
    console.log('geminiService: factSheet.employerLegalName:', factSheet.employerLegalName);
    console.log('geminiService: factSheet.employerTradeName:', factSheet.employerTradeName);
  }
  console.log('geminiService: factSheetContext preview:', factSheetContext.substring(0, 200) + '...');

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

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7, // optional: control creativity
        maxOutputTokens: 1024, // optional: set max response length
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Robust JSON extraction: Find the first '{' and last '}' to handle potential markdown wrappers
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
    }
    const cleanedText = jsonMatch[0];
    
    let result: AIAnalysisResult;
    try {
      result = JSON.parse(cleanedText) as AIAnalysisResult;
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", text);
      throw new Error("AI response was not valid JSON");
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
      summary: "Failed to generate AI analysis due to a technical error.",
      factSheetSummary: "Comparison unavailable due to error.",
      webPresenceSummary: "Analysis failed.",
      concerns: ["System error during processing. Please try again or verify API Key."],
      recommendation: "Manual Review Required",
      debug: {
        prompt: prompt, // Return the prompt even if call fails, for debugging
        rawResponse: error instanceof Error ? error.message : "Unknown error"
      }
    };
  }
};
