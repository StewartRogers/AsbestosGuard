
import { GoogleGenAI } from "@google/genai";
import { LicenseApplication, AIAnalysisResult } from "../types";

export const analyzeApplication = async (application: LicenseApplication): Promise<AIAnalysisResult> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      riskScore: 'LOW',
      summary: "AI Analysis unavailable. API Key is missing in the environment configuration.",
      webPresenceSummary: "Search unavailable without API Key.",
      concerns: ["System configuration error."],
      recommendation: "Manual Review Required"
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Use specific company info for the search query
    const companyInfo = `${application.companyName} located at ${application.address}`;
    const tradeName = application.wizardData?.firmTradeName ? `(also known as ${application.wizardData.firmTradeName})` : '';

    const prompt = `
      You are an expert regulator for hazardous materials licensing (Asbestos). 
      
      Task 1: Web Search & Business Summary
      Search the web for information about "${companyInfo}" ${tradeName}.
      Write a professional business summary (approx 250 words) based on their public web presence (website, reviews, business registries, news).
      - If they have a website, summarize their services.
      - If they have reviews, note the general sentiment.
      - If no specific information is found, explicitly state: "No significant public web presence found for this specific entity."

      Task 2: Regulatory Risk Analysis
      Review the provided Application Data below for risk and completeness.
      1. **Worker Certification Ratio**: Compare 'firmWorkersCount' vs 'firmCertLevel1to4' and 'firmCertLevel3'. Low certification rates (under 50%) are a potential risk.
      2. **History & Violations**: Check 'safetyHistory' and 'wizardData.history*' fields. Any past refusals, suspensions, or non-compliance is HIGH risk.
      3. **Scope vs. Experience**: Does the 'yearsExperience' align with the 'scope*' of work?
      4. **NOP Compliance**: Check if 'firmNopDate' or 'firmNopNumber' is provided. 
      
      Application Data:
      ${JSON.stringify(application, null, 2)}
      
      OUTPUT FORMAT:
      You must return strictly a valid JSON object. Do not wrap it in markdown code blocks.
      The JSON must match this structure:
      {
        "riskScore": "LOW" | "MEDIUM" | "HIGH",
        "summary": "A professional regulatory summary of the application data.",
        "webPresenceSummary": "The 250-word business summary from Task 1.",
        "concerns": ["List of specific risk factors found..."],
        "recommendation": "Approve", "Reject", or "Request Information" (with details).
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType: "application/json" is NOT allowed when using googleSearch tool.
        // We rely on the prompt to enforce JSON format.
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean up potential markdown formatting (```json ... ```)
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
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

    // Add sources to the result object
    return {
      ...result,
      sources
    };

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    return {
      riskScore: 'MEDIUM',
      summary: "Failed to generate AI analysis due to a technical error.",
      webPresenceSummary: "Analysis failed.",
      concerns: ["System error during processing."],
      recommendation: "Manual Review Required"
    };
  }
};
