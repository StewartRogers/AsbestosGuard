/**
 * Gemini AI Analysis Service
 * Orchestrates three parallel AI agent calls to analyse an asbestos licence application.
 *
 * Agent1 – Fact Sheet Analyzer   : EFS vs application comparison
 * Agent2 – Risk and Policy Analyst: policy/risk assessment
 * Agent3 – Business Profile Analyst: geographic & web-presence risk scan
 *
 * Improvements over the previous version:
 * - Agent roles are passed via the Gemini systemInstruction field (not prepended to user prompt)
 * - jsonMode: true guarantees clean JSON output with no markdown wrapping
 * - temperature: 0.2 for more consistent, deterministic structured responses
 * - finishReason is surfaced in per-step debug output
 * - Raw response is logged (truncated) when JSON parsing fails for easier debugging
 */

import { LicenseApplication, AIAnalysisResult, EmployerFactSheet } from '../types.js';
import { askGemini } from './geminiService.js';
import logger from '../utils/logger.js';

interface PromptParts {
  systemInstruction: string;
  userPrompt: string;
}

interface AgentStepResult {
  systemInstruction: string;
  userPrompt: string;
  raw: string;
  parsed: any;
  startedAt: string;
  finishedAt: string;
  durationMs: number | null;
  finishReason?: string;
  status: 'success' | 'failed' | 'partial';
  agentRole: string;
}

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildFactCheckPrompt(
  application: LicenseApplication,
  factSheet?: EmployerFactSheet
): PromptParts {
  const wizard = application.wizardData || ({} as any);
  const accountNumber = wizard.firmAccountNumber || factSheet?.employerId || 'Unknown';

  const systemInstruction = `You are Agent1: Fact Sheet Analyzer for a WorkSafeBC asbestos licensing system.
Compare the Employer Fact Sheet (EFS) to the asbestos licence application and identify any mismatches.

Return ONLY valid JSON matching this exact schema — no explanation, no markdown:
{
  "summary": "one sentence describing whether the EFS matches the application",
  "internalRecordValidation": {
    "recordFound": boolean,
    "accountNumber": "${accountNumber}",
    "overdueBalance": number,
    "statusMatch": boolean,
    "concerns": ["string"]
  },
  "riskScore": "LOW" | "MEDIUM" | "HIGH"
}`;

  const userPrompt = `Application Data:
${JSON.stringify(application)}

Employer Fact Sheet:
${JSON.stringify(factSheet || {})}`;

  return { systemInstruction, userPrompt };
}

function buildPolicyPrompt(
  application: LicenseApplication,
  factSheet?: EmployerFactSheet
): PromptParts {
  const wizard = application.wizardData || ({} as any);

  const systemInstruction = `You are Agent2: Risk and Policy Analyst for a WorkSafeBC asbestos licensing system.
Perform an AI-based risk and policy assessment for the supplied asbestos licence application.

Key rules:
- Consider worker certification levels, licence history flags, and overdue balances.
- Highlight any policy violations and missing mandatory information.
- isTestAccount should be true only if the application clearly contains test/dummy data (e.g. "Test Company", "123 Test St").

Return ONLY valid JSON matching this exact schema — no explanation, no markdown:
{
  "riskScore": "LOW" | "MEDIUM" | "HIGH",
  "isTestAccount": boolean,
  "summary": "one sentence overall assessment",
  "concerns": ["string"],
  "policyViolations": [
    { "field": string, "value": string, "policy": string, "clause": string, "recommendation": string }
  ],
  "recommendation": "APPROVE" | "REJECT" | "REQUEST_INFO" | "INVALID_APPLICATION" | "MANUAL_REVIEW_REQUIRED",
  "requiredActions": ["string"],
  "certificationAnalysis": {
    "totalWorkers": number | null,
    "certifiedWorkers": number | null,
    "complianceRatio": number | null,
    "meetsRequirement": boolean | null
  }
}`;

  const userPrompt = `Application Data:
${JSON.stringify(application)}

Employer Fact Sheet:
${JSON.stringify(factSheet || {})}

Workers certified level 1–4: ${wizard.firmCertLevel1to4 || 0} of ${wizard.firmWorkersCount || 0}`;

  return { systemInstruction, userPrompt };
}

function buildWebPrompt(application: LicenseApplication): PromptParts {
  const wizard = application.wizardData || ({} as any);
  const companyName = wizard.firmLegalName || application.companyName || 'Unknown Company';
  const address =
    wizard.firmPhysicalAddress || wizard.firmMailingAddress || 'Address not provided';

  const systemInstruction = `You are Agent3: Business Profile Analyst for a WorkSafeBC asbestos licensing system.
Assess the business profile of the applicant and flag geographic or industry risks.
Note: you do not have live internet access. Base your assessment on the supplied application data.

Return ONLY valid JSON matching this exact schema — no explanation, no markdown:
{
  "searchSummary": "short summary of what you can assess about the company",
  "webPresenceValidation": {
    "companyFound": boolean,
    "relevantIndustry": boolean,
    "searchSummary": string
  },
  "geographicValidation": {
    "addressExistsInBC": boolean,
    "addressConflicts": ["string"],
    "verifiedLocation": string | null
  },
  "redFlags": ["string"],
  "yellowFlags": ["string"],
  "riskScore": "LOW" | "MEDIUM" | "HIGH"
}`;

  const userPrompt = `Company: ${companyName}
Address: ${address}

Full Application Data:
${JSON.stringify(application)}`;

  return { systemInstruction, userPrompt };
}

// ─── JSON parsing ────────────────────────────────────────────────────────────

/**
 * Parse JSON from a Gemini response.
 * With jsonMode: true the response should be clean JSON already.
 * This function handles the rare edge-case where the model still wraps in markdown.
 */
function tryParseJson(raw: string, agentRole: string): any | null {
  if (!raw) return null;

  let jsonStr = raw.trim();

  // Strip markdown code fences if present (fallback for non-JSON-mode calls)
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1];

  // Find the outermost JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) jsonStr = objectMatch[0];

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Log a truncated excerpt to help diagnose prompt/model issues
    const excerpt = raw.length > 300 ? raw.slice(0, 300) + '…' : raw;
    logger.warn('JSON parse failed for Gemini agent response', { agentRole, rawExcerpt: excerpt });
    return null;
  }
}

// ─── Agent runner ────────────────────────────────────────────────────────────

async function runAgentStep(agentRole: string, parts: PromptParts): Promise<AgentStepResult> {
  const startedAt = new Date().toISOString();
  try {
    const response = await askGemini(parts.userPrompt, {
      systemInstruction: parts.systemInstruction,
      jsonMode: true,
      temperature: 0.2,   // Low temperature for consistent structured output
      timeoutMs: 60000,
      maxTokens: 4096,
    });

    const finishedAt = new Date().toISOString();
    const parsed = tryParseJson(response.response, agentRole);

    // Warn if the response was truncated — parsed data may be incomplete
    if (response.finishReason === 'MAX_TOKENS') {
      logger.warn(`Gemini response truncated for ${agentRole} — consider increasing maxTokens`);
    }

    return {
      systemInstruction: parts.systemInstruction,
      userPrompt: parts.userPrompt,
      raw: response.response,
      parsed,
      startedAt,
      finishedAt,
      durationMs: response.duration_ms,
      finishReason: response.finishReason,
      status: parsed ? 'success' : 'failed',
      agentRole,
    };
  } catch (err: any) {
    const finishedAt = new Date().toISOString();
    logger.error(`Gemini agent step failed for ${agentRole}`, {
      error: err?.message || String(err),
    });
    return {
      systemInstruction: parts.systemInstruction,
      userPrompt: parts.userPrompt,
      raw: err?.message || String(err),
      parsed: null,
      startedAt,
      finishedAt,
      durationMs: null,
      status: 'failed',
      agentRole,
    };
  }
}

// ─── Mapping helpers ─────────────────────────────────────────────────────────

const mapRiskScore = (score: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'INVALID' => {
  switch ((score || '').toUpperCase().trim()) {
    case 'LOW': return 'LOW';
    case 'MEDIUM': return 'MEDIUM';
    case 'HIGH': return 'HIGH';
    default: return 'INVALID';
  }
};

const mapRecommendation = (
  rec: string
): 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'INVALID_APPLICATION' | 'MANUAL_REVIEW_REQUIRED' => {
  const lower = (rec || '').toLowerCase();
  if (lower.includes('approve')) return 'APPROVE';
  if (lower.includes('reject')) return 'REJECT';
  if (lower.includes('request') || lower.includes('info')) return 'REQUEST_INFO';
  if (lower.includes('invalid')) return 'INVALID_APPLICATION';
  return 'MANUAL_REVIEW_REQUIRED';
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse an application using three parallel Gemini AI agents.
 * All three agents run concurrently to minimise total latency.
 */
export async function analyzeApplication(
  application: LicenseApplication,
  factSheet?: EmployerFactSheet
): Promise<AIAnalysisResult> {
  try {
    const [fact, policy, web] = await Promise.all([
      runAgentStep('Fact Sheet Analyzer', buildFactCheckPrompt(application, factSheet)),
      runAgentStep('Risk and Policy Analyst', buildPolicyPrompt(application, factSheet)),
      runAgentStep('Business Profile Analyst', buildWebPrompt(application)),
    ]);

    const executedAt = new Date().toISOString();
    const factParsed = fact.parsed || {};
    const policyParsed = policy.parsed || {};
    const webParsed = web.parsed || {};

    const internalRecordValidation =
      factParsed.internalRecordValidation || factParsed.internal_record_validation || {
        recordFound: !!factSheet,
        concerns: factParsed.concerns || [],
      };

    const geographicValidation =
      webParsed.geographicValidation || webParsed.geographic_validation || {
        addressExistsInBC: false,
        addressConflicts: [],
      };

    const webPresenceValidation =
      webParsed.webPresenceValidation || webParsed.web_presence_validation || {
        companyFound: !!webParsed.companyFound,
        relevantIndustry: webParsed.relevantIndustry ?? false,
        searchSummary: webParsed.searchSummary || '',
      };

    const certificationAnalysis =
      policyParsed.certificationAnalysis || policyParsed.certification_analysis || {
        totalWorkers: application.wizardData?.firmWorkersCount ?? null,
        certifiedWorkers: application.wizardData?.firmCertLevel1to4 ?? null,
        complianceRatio: null,
        meetsRequirement: null,
      };

    const summaryPieces = [
      factParsed.summary,
      policyParsed.summary,
      webParsed.searchSummary || webPresenceValidation.searchSummary,
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
        concerns: internalRecordValidation.concerns || [],
      },
      geographicValidation: {
        addressExistsInBC: geographicValidation.addressExistsInBC ?? false,
        addressConflicts: geographicValidation.addressConflicts || [],
        verifiedLocation: geographicValidation.verifiedLocation ?? null,
      },
      webPresenceValidation: {
        companyFound: webPresenceValidation.companyFound ?? false,
        relevantIndustry: webPresenceValidation.relevantIndustry ?? false,
        searchSummary: webPresenceValidation.searchSummary || '',
      },
      certificationAnalysis: {
        totalWorkers: certificationAnalysis.totalWorkers ?? null,
        certifiedWorkers: certificationAnalysis.certifiedWorkers ?? null,
        complianceRatio: certificationAnalysis.complianceRatio ?? null,
        meetsRequirement: certificationAnalysis.meetsRequirement ?? null,
      },
      concerns: policyParsed.concerns || [],
      policyViolations: policyParsed.policyViolations || policyParsed.policy_violations || [],
      recommendation: mapRecommendation(
        policyParsed.recommendation || policyParsed.decision || ''
      ),
      requiredActions: policyParsed.requiredActions || policyParsed.required_actions || [],
      sources: [
        { title: 'Agent1: Fact Sheet vs Application', uri: '' },
        { title: 'Agent2: Risk & Policy Assessment', uri: '' },
        { title: 'Agent3: Business Profile & Web Search', uri: '' },
      ],
      factSheetSummary:
        factParsed.summary ||
        (factSheet
          ? `Matched to ${factSheet.employerLegalName} (ID: ${factSheet.employerId})`
          : 'No fact sheet match'),
      webPresenceSummary: webParsed.searchSummary || undefined,
      debug: {
        perStepDebug: { fact, policy, web },
        executedAt,
      } as any,
      executedAt,
    } as any;

    return analysisResult;
  } catch (error) {
    logger.error('Gemini analysis service failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export default { analyzeApplication };
