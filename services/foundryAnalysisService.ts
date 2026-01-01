import { LicenseApplication, AIAnalysisResult, EmployerFactSheet } from "../types";
import { askAgent, InvokeResponse } from "./foundryAgentClient.js";
import { getAgentId } from "./config.js";

/**
 * Foundry-based analysis service using Azure AI Foundry agents
 * Uses agent1 (EFSAGENT) to analyze license applications
 */

/**
 * Sends application to Foundry agent1 for analysis
 * Returns structured AIAnalysisResult matching the expected format
 */
export async function analyzeApplication(
  application: LicenseApplication,
  factSheet?: EmployerFactSheet
): Promise<AIAnalysisResult> {
  try {
    // Build a comprehensive prompt for the Foundry agent
    const prompt = buildAnalysisPrompt(application, factSheet);
    const agentId = getAgentId('agent1');

    console.log(`[foundryAnalysisService] Sending application to Foundry agent (${agentId})...`);
    
    // Call agent1 with the analysis prompt
    const agentResponse: InvokeResponse = await askAgent(agentId, prompt, { timeoutMs: 60000 });

    console.log('[foundryAnalysisService] Received response from agent1');

    // Parse and structure the agent response
    const analysisResult = parseAgentResponse(application, agentResponse.response, factSheet);
    const executedAt = new Date().toISOString();
    (analysisResult as any).executedAt = executedAt;
    analysisResult.debug = {
      prompt,
      rawResponse: agentResponse.response,
      agentId,
      durationMs: agentResponse.duration_ms,
      executedAt
    } as any;
    
    return analysisResult;
  } catch (error) {
    console.error('[foundryAnalysisService] Analysis failed:', error);
    throw error;
  }
}

/**
 * Builds a comprehensive prompt for the Foundry agent
 */
function buildAnalysisPrompt(application: LicenseApplication, factSheet?: EmployerFactSheet): string {
  const wizard = application.wizardData || {} as any;
  
  // Simpler, more direct prompt for the agent
  const companyName = wizard.firmLegalName || application.companyName || 'Unknown Company';
  const accountNumber = wizard.firmAccountNumber || 'N/A';
  const hasFactSheet = factSheet ? 'Yes' : 'No';
  const overdueBalance = factSheet?.overdueBalance || 0;
  const yearsInBusiness = wizard.firmNopDate ? 
    new Date().getFullYear() - new Date(wizard.firmNopDate).getFullYear() : 
    application.safetyHistory?.yearsExperience || 0;

  const prompt = `Analyze this asbestos work license application:

Company: ${companyName}
Account Number: ${accountNumber}
Workers: ${wizard.firmWorkersCount || 0}
Years in Business: ${yearsInBusiness}
Has Internal Record: ${hasFactSheet}
Overdue Balance: $${overdueBalance}

Certifications:
- Level 1-4 Certified: ${wizard.firmCertLevel1to4 || 0}
- Level 3 Certified: ${wizard.firmCertLevel3 || 0}

History Flags:
- Refused in Last 7 Years: ${wizard.historyRefused7Years ? 'Yes' : 'No'}
- Enforcement Action: ${wizard.historyRefusedAuth ? 'Yes' : 'No'}
- Non-Compliance: ${wizard.historyNonCompliance ? 'Yes' : 'No'}
- Suspended: ${wizard.historySuspended ? 'Yes' : 'No'}

Compliance Acknowledgements:
- Outstanding Amounts: ${wizard.ackOutstandingAmounts ? 'Acknowledged' : 'Not Acknowledged'}
- Compliance: ${wizard.ackCompliance ? 'Acknowledged' : 'Not Acknowledged'}
- Enforcement: ${wizard.ackEnforcement ? 'Acknowledged' : 'Not Acknowledged'}

Respond ONLY with valid JSON (no other text):
{
  "riskScore": "LOW|MEDIUM|HIGH",
  "isTestAccount": false,
  "summary": "Brief risk assessment summary",
  "internalRecordValidation": {
    "recordFound": ${hasFactSheet === 'Yes' ? 'true' : 'false'},
    "accountNumber": "${accountNumber}",
    "overdueBalance": ${overdueBalance},
    "statusMatch": true,
    "concerns": []
  },
  "geographicValidation": {
    "addressExistsInBC": true,
    "addressConflicts": [],
    "verifiedLocation": "BC"
  },
  "webPresenceValidation": {
    "companyFound": true,
    "relevantIndustry": true,
    "searchSummary": "Company operates in asbestos abatement sector"
  },
  "certificationAnalysis": {
    "totalWorkers": ${wizard.firmWorkersCount || 0},
    "certifiedWorkers": ${Math.min(wizard.firmCertLevel1to4 || 0, wizard.firmWorkersCount || 0)},
    "complianceRatio": ${((wizard.firmCertLevel1to4 || 0) / Math.max(wizard.firmWorkersCount || 1, 1)).toFixed(2)},
    "meetsRequirement": true
  },
  "concerns": [],
  "policyViolations": [],
  "recommendation": "APPROVE",
  "requiredActions": [],
  "sources": [{"title": "Foundry Agent Analysis", "uri": ""}]
}`;

  return prompt;
}

/**
 * Parses the agent response and structures it as AIAnalysisResult
 */
function parseAgentResponse(
  application: LicenseApplication,
  agentResponse: string,
  factSheet?: EmployerFactSheet
): AIAnalysisResult {
  let parsed: any;

  try {
    // Trim response and remove common formatting
    const cleanResponse = agentResponse.trim();
    
    // Try to extract JSON from agent response (may contain markdown code blocks or extra text)
    let jsonStr = cleanResponse;
    
    // Remove markdown code blocks if present
    if (cleanResponse.includes('```json')) {
      const match = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonStr = match[1];
    } else if (cleanResponse.includes('```')) {
      const match = cleanResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonStr = match[1];
    }
    
    // Extract JSON object if it's embedded in text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    console.log('[foundryAnalysisService] Attempting to parse JSON...');
    parsed = JSON.parse(jsonStr);
    console.log('[foundryAnalysisService] JSON parsed successfully');
  } catch (error) {
    console.error('[foundryAnalysisService] Failed to parse agent JSON:');
    console.error('[foundryAnalysisService] Raw response:', agentResponse);
    console.error('[foundryAnalysisService] Parse error:', (error as Error).message);
    
    // Return a default analysis if parsing fails
    parsed = {
      riskScore: 'MEDIUM',
      isTestAccount: false,
      summary: 'Analysis could not be completed due to parsing error. Please review manually.',
      internalRecordValidation: { recordFound: false, concerns: ['Unable to parse agent response'] },
      geographicValidation: { addressExistsInBC: false, addressConflicts: [] },
      webPresenceValidation: { companyFound: false, relevantIndustry: false, searchSummary: 'Analysis incomplete' },
      certificationAnalysis: { complianceRatio: 0, meetsRequirement: false },
      concerns: ['Agent response parsing failed'],
      policyViolations: [],
      recommendation: 'MANUAL_REVIEW_REQUIRED',
      requiredActions: ['Manual review required - agent response invalid'],
      sources: [{ title: 'Foundry Agent Analysis - Parse Failed', uri: '' }]
    };
  }

  // Map recommendation string to expected enum values
  const mapRecommendation = (rec: string): 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'INVALID_APPLICATION' | 'MANUAL_REVIEW_REQUIRED' => {
    const lower = (rec || '').toLowerCase();
    if (lower.includes('approve')) return 'APPROVE';
    if (lower.includes('reject')) return 'REJECT';
    if (lower.includes('request') || lower.includes('info')) return 'REQUEST_INFO';
    if (lower.includes('invalid')) return 'INVALID_APPLICATION';
    return 'MANUAL_REVIEW_REQUIRED';
  };

  // Map risk score
  const mapRiskScore = (score: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'INVALID' => {
    const lower = (score || '').toUpperCase().trim();
    if (lower === 'LOW') return 'LOW';
    if (lower === 'MEDIUM') return 'MEDIUM';
    if (lower === 'HIGH') return 'HIGH';
    return 'INVALID';
  };

  // Build AIAnalysisResult
  const result: AIAnalysisResult = {
    riskScore: mapRiskScore(parsed.riskScore || 'MEDIUM'),
    isTestAccount: parsed.isTestAccount || false,
    summary: parsed.summary || 'Analysis completed with default values',
    internalRecordValidation: {
      recordFound: parsed.internalRecordValidation?.recordFound ?? false,
      accountNumber: parsed.internalRecordValidation?.accountNumber ?? null,
      overdueBalance: parsed.internalRecordValidation?.overdueBalance ?? null,
      statusMatch: parsed.internalRecordValidation?.statusMatch ?? null,
      concerns: parsed.internalRecordValidation?.concerns || []
    },
    geographicValidation: {
      addressExistsInBC: parsed.geographicValidation?.addressExistsInBC ?? false,
      addressConflicts: parsed.geographicValidation?.addressConflicts || [],
      verifiedLocation: parsed.geographicValidation?.verifiedLocation ?? null
    },
    webPresenceValidation: {
      companyFound: parsed.webPresenceValidation?.companyFound ?? false,
      relevantIndustry: parsed.webPresenceValidation?.relevantIndustry ?? false,
      searchSummary: parsed.webPresenceValidation?.searchSummary || ''
    },
    certificationAnalysis: {
      totalWorkers: parsed.certificationAnalysis?.totalWorkers ?? null,
      certifiedWorkers: parsed.certificationAnalysis?.certifiedWorkers ?? null,
      complianceRatio: parsed.certificationAnalysis?.complianceRatio ?? null,
      meetsRequirement: parsed.certificationAnalysis?.meetsRequirement ?? null
    },
    concerns: parsed.concerns || [],
    policyViolations: parsed.policyViolations || [],
    recommendation: mapRecommendation(parsed.recommendation),
    requiredActions: parsed.requiredActions || [],
    sources: parsed.sources || [{ title: 'Foundry Agent Analysis', uri: '' }],
    factSheetSummary: factSheet ? 
      `Matched to ${factSheet.employerLegalName} (ID: ${factSheet.employerId})` : 
      'No fact sheet match',
    debug: {
      prompt: 'Application risk analysis via Foundry Agent1',
      rawResponse: agentResponse
    }
  };

  return result;
}

export default { analyzeApplication };
