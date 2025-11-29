
import { GoogleGenAI, Type } from "@google/genai";
import { LicenseApplication, AIAnalysisResult } from "../types";

export const analyzeApplication = async (application: LicenseApplication): Promise<AIAnalysisResult> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      riskScore: 'LOW',
      summary: "AI Analysis unavailable. API Key is missing in the environment configuration.",
      concerns: ["System configuration error."],
      recommendation: "Manual Review Required"
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      You are an expert regulator for hazardous materials licensing (Asbestos). 
      Review the following Asbestos License Application for risk and completeness.
      
      Application Data:
      ${JSON.stringify(application, null, 2)}
      
      Perform a deep risk analysis focusing on:
      1. **Worker Certification Ratio**: Compare 'firmWorkersCount' vs 'firmCertLevel1to4' and 'firmCertLevel3'. Low certification rates (under 50%) are a potential risk.
      2. **History & Violations**: Check 'safetyHistory' and 'wizardData.history*' fields. Any past refusals, suspensions, or non-compliance is HIGH risk.
      3. **Scope vs. Experience**: Does the 'yearsExperience' align with the 'scope*' of work (e.g., transport, surveys)?
      4. **NOP Compliance**: Check if 'firmNopDate' or 'firmNopNumber' is provided. If they have many workers but no recent NOPs, that is a concern.
      
      Provide a JSON response with:
      - riskScore: "LOW", "MEDIUM", or "HIGH"
      - summary: A professional regulatory summary.
      - concerns: A list of specific risk factors found.
      - recommendation: "Approve", "Reject", or "Request Information" (with what info is needed).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
            summary: { type: Type.STRING },
            concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING }
          },
          required: ["riskScore", "summary", "concerns", "recommendation"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    return {
      riskScore: 'MEDIUM',
      summary: "Failed to generate AI analysis due to a technical error.",
      concerns: ["System error during processing."],
      recommendation: "Manual Review Required"
    };
  }
};
