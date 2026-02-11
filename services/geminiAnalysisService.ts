/**
 * Gemini AI Analysis Service
 * Replaces Azure Foundry analysis with Gemini API
 */

import { LicenseApplication, AIAnalysisResult, EmployerFactSheet } from "../types";
import { askGemini } from "./geminiService.js";

interface AgentStepResult {
  prompt: string;
  raw: string;
  parsed: any;
  startedAt: string;
  finishedAt: string;
  durationMs: number | null;
  status: 'success' | 'failed' | 'disabled';
  agentRole?: string;
}

/**
 * Analyzes application using Gemini AI with three different analysis perspectives
 * - Agent1: Fact sheet vs application comparison
 * - Agent2: Policy/risk assessment  
 * - Agent3: Business profile & web search risk scan
 */
export async function analyzeApplication(
  application: LicenseApplication,
  factSheet?: EmployerFactSheet
): Promise<AIAnalysisResult> {
  try {
    const [fact, policy, web] = await Promise.all([
      runAgentStep('Fact Sheet Analyzer', buildFactCheckPrompt(application, factSheet)),
      runAgentStep('Risk and Policy Analyst', buildPolicyPrompt(application, factSheet)),
      runAgentStep('Business Profile Analyst', buildWebPrompt(application))
    ]);

    const executedAt = new Date().toISOString();
    const factParsed = fact.parsed || {};
    const policyParsed = policy.parsed || {};
    const webParsed = web.parsed || {};

    const mapRiskScore = (score: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'INVALID' => {
      const lower = (score || '').toUpperCase().trim();
      if (lower === 'LOW') return 'LOW';
      if (lower === 'MEDIUM') return 'MEDIUM';
      if (lower === 'HIGH') return 'HIGH';
      return 'INVALID';
    };

    const mapRecommendation = (rec: string): 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'INVALID_APPLICATION' | 'MANUAL_REVIEW_REQUIRED' => {
      const lower = (rec || '').toLowerCase();
      if (lower.includes('approve')) return 'APPROVE';
      if (lower.includes('reject')) return 'REJECT';
      if (lower.includes('request') || lower.includes('info')) return 'REQUEST_INFO';
      if (lower.includes('invalid')) return 'INVALID_APPLICATION';
      return 'MANUAL_REVIEW_REQUIRED';
    };

    const internalRecordValidation = factParsed.internalRecordValidation || factParsed.internal_record_validation || {
      recordFound: !!factSheet,
      concerns: factParsed.concerns || []
    };

    const geographicValidation = webParsed.geographicValidation || webParsed.geographic_validation || {
      addressExistsInBC: false,
      addressConflicts: []
    };

    const webPresenceValidation = webParsed.webPresenceValidation || webParsed.web_presence_validation || {
      companyFound: !!webParsed.companyFound,
      relevantIndustry: webParsed.relevantIndustry ?? false,
      searchSummary: webParsed.searchSummary || ''
    };

    const certificationAnalysis = policyParsed.certificationAnalysis || policyParsed.certification_analysis || {
      totalWorkers: application.wizardData?.firmWorkersCount ?? null,
      certifiedWorkers: application.wizardData?.firmCertLevel1to4 ?? null,
      complianceRatio: null,
      meetsRequirement: null
    };

    const summaryPieces = [
      factParsed.summary,
      policyParsed.summary,
      webParsed.searchSummary || webPresenceValidation.searchSummary
    ].filter(Boolean);

    const analysisResult: AIAnalysisResult = {
      riskScore: mapRiskScore(policyParsed.riskScore || policyParsed.risk_score || 'MEDIUM'),
      isTestAccount: policyParsed.isTestAccount || policyParsed.is_test_account || false,
      summary: summaryPieces.join(' ') || 'Automated analysis completed.',
      internalRecordValidation: {
        recordFound: internalRecordValidation.recordFound ?? false,
        accountNumber: internalRecordValidation.accountNumber ?? null,
        overdueBalance: internalRecordValidation.overdueBalance ?? null,
        statusMatch: internalRecordValidation.statusMatch ?? null,
        concerns: internalRecordValidation.concerns || []
      },
      geographicValidation: {
        addressExistsInBC: geographicValidation.addressExistsInBC ?? false,
        addressConflicts: geographicValidation.addressConflicts || [],
        verifiedLocation: geographicValidation.verifiedLocation ?? null
      },
      webPresenceValidation: {
        companyFound: webPresenceValidation.companyFound ?? false,
        relevantIndustry: webPresenceValidation.relevantIndustry ?? false,
        searchSummary: webPresenceValidation.searchSummary || ''
      },
      certificationAnalysis: {
        totalWorkers: certificationAnalysis.totalWorkers ?? null,
        certifiedWorkers: certificationAnalysis.certifiedWorkers ?? null,
        complianceRatio: certificationAnalysis.complianceRatio ?? null,
        meetsRequirement: certificationAnalysis.meetsRequirement ?? null
      },
      concerns: policyParsed.concerns || [],
      policyViolations: policyParsed.policyViolations || policyParsed.policy_violations || [],
      recommendation: mapRecommendation(policyParsed.recommendation || policyParsed.decision || ''),
      requiredActions: policyParsed.requiredActions || policyParsed.required_actions || [],
      sources: [
        { title: 'Agent1: Fact Sheet vs Application', uri: '' },
        { title: 'Agent2: Risk & Policy Assessment', uri: '' },
        { title: 'Agent3: Business Profile & Web Search', uri: '' },
      ],
      factSheetSummary: factParsed.summary || (factSheet ? `Matched to ${factSheet.employerLegalName} (ID: ${factSheet.employerId})` : 'No fact sheet match'),
      webPresenceSummary: webParsed.searchSummary || undefined,
      debug: {
        perStepDebug: {
          fact,
          policy,
          web
        },
        executedAt
      } as any,
      executedAt
    } as any;

    return analysisResult;
  } catch (error) {
    console.error('[geminiAnalysisService] Analysis failed:', error);
    throw error;
  }
}

function buildFactCheckPrompt(application: LicenseApplication, factSheet?: EmployerFactSheet): string {
  const wizard = application.wizardData || ({} as any);
  const accountNumber = wizard.firmAccountNumber || factSheet?.employerId || 'Unknown';

  return `You are Agent1: Fact Sheet Analyzer. Compare the Employer Fact Sheet (EFS) to the asbestos license application and report mismatches.
Return ONLY JSON with this shape:
{
  "summary": "brief sentence about whether EFS matches the application",
  "internalRecordValidation": {
    "recordFound": boolean,
    "accountNumber": "${accountNumber}",
    "overdueBalance": ${factSheet?.overdueBalance ?? 0},
    "statusMatch": boolean,
    "concerns": ["list any mismatches or missing data"]
  },
  "riskScore": "LOW|MEDIUM|HIGH"
}

Application Data: ${JSON.stringify(application)}
Employer Fact Sheet: ${JSON.stringify(factSheet || {})}`;
}

function buildPolicyPrompt(application: LicenseApplication, factSheet?: EmployerFactSheet): string {
  const wizard = application.wizardData || ({} as any);
  return `You are Agent2: Risk and Policy Analyst. Perform an AI-based risk and policy assessment for this asbestos license application.
Return ONLY JSON with fields: riskScore, summary, concerns, policyViolations (array), recommendation, requiredActions (array), certificationAnalysis { totalWorkers, certifiedWorkers, complianceRatio, meetsRequirement }, isTestAccount.

Key rules:
- Consider worker certification levels, history flags, and overdue balances (${factSheet?.overdueBalance ?? 0}).
- Highlight any policy violations and missing information.

Application Data: ${JSON.stringify(application)}
Employer Fact Sheet: ${JSON.stringify(factSheet || {})}
Workers certified level 1-4: ${wizard.firmCertLevel1to4 || 0} of ${wizard.firmWorkersCount || 0}`;
}

function buildWebPrompt(application: LicenseApplication): string {
  const wizard = application.wizardData || ({} as any);
  const companyName = wizard.firmLegalName || application.companyName || 'Unknown Company';
  const address = wizard.firmPhysicalAddress || wizard.firmMailingAddress || 'Address not provided';

  return `You are Agent3: Business Profile Analyst. Perform a business profile assessment to flag risks for asbestos work.
Return ONLY JSON:
{
  "searchSummary": "short summary of what you can assess about the company",
  "webPresenceValidation": { "companyFound": boolean, "relevantIndustry": boolean, "searchSummary": "" },
  "geographicValidation": { "addressExistsInBC": boolean, "addressConflicts": [], "verifiedLocation": "" },
  "redFlags": ["serious issues"],
  "yellowFlags": ["cautionary items"],
  "riskScore": "LOW|MEDIUM|HIGH"
}

Company: ${companyName}
Address: ${address}

Full Application Data: ${JSON.stringify(application)}`;
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  const clean = raw.trim();
  let jsonStr = clean;

  if (clean.includes('```json')) {
    const match = clean.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) jsonStr = match[1];
  } else if (clean.includes('```')) {
    const match = clean.match(/```\s*([\s\S]*?)\s*```/);
    if (match) jsonStr = match[1];
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[geminiAnalysisService] JSON parse failed for agent response');
    return null;
  }
}

async function runAgentStep(agentRole: string, prompt: string): Promise<AgentStepResult> {
  const startedAt = new Date().toISOString();
  try {
    const response = await askGemini(prompt, { timeoutMs: 60000 });
    const parsed = tryParseJson(response.response);
    const finishedAt = new Date().toISOString();

    return {
      prompt,
      raw: response.response,
      parsed,
      startedAt,
      finishedAt,
      durationMs: response.duration_ms,
      status: parsed ? 'success' : 'failed',
      agentRole
    };
  } catch (err: any) {
    const finishedAt = new Date().toISOString();
    return {
      prompt,
      raw: err?.message || String(err),
      parsed: null,
      startedAt,
      finishedAt,
      durationMs: null,
      status: 'failed',
      agentRole
    };
  }
}

export default { analyzeApplication };
