import React, { useState, useEffect } from 'react';
import { LicenseApplication, ApplicationStatus, AIAnalysisResult, EmployerFactSheet } from '../../types';
import { Button, Card, Badge } from '../../components/UI';
import { ApplicationSummary } from '../../components/ApplicationSummary';
import { analyzeApplicationServer } from '../../services/geminiClient';
import { ArrowLeft, BrainCircuit, CheckCircle, XCircle, FileText, AlertTriangle, MessageSquare, Building2, TrendingUp, AlertOctagon, Globe, ExternalLink, Database, Terminal } from 'lucide-react';
import { saveAnalysis, getAnalysis, deleteAnalysis } from '../../services/apiService';

interface ApplicationReviewProps {
  application: LicenseApplication;
  factSheets: EmployerFactSheet[];
  onUpdate: (app: LicenseApplication) => void;
  onBack: () => void;
}

const ApplicationReview: React.FC<ApplicationReviewProps> = ({ application, factSheets, onUpdate, onBack }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [adminNotes, setAdminNotes] = useState(application.adminNotes || '');
  const [showFactDebug, setShowFactDebug] = useState(false);
  const [showPolicyDebug, setShowPolicyDebug] = useState(false);
  const [showWebDebug, setShowWebDebug] = useState(false);

  // Attempt to link application to a Fact Sheet by Account Number only
  const matchedFactSheet = factSheets.find(
    fs => application.wizardData?.firmAccountNumber && fs.employerId === application.wizardData.firmAccountNumber
  );

  // Helper to find per-step debug in multiple possible shapes (defensive)
  const getPerStepDebug = (res: AIAnalysisResult | null) => {
    if (!res) return {} as any;
    // Try common locations
    const candidates = [
      (res as any).debug?.perStepDebug,
      (res as any).debug?.per_step_debug,
      (res as any).perStepDebug,
      (res as any).per_step_debug,
      (res as any).extraDebug?.perStepDebug,
      (res as any).debug?.extraDebug?.perStepDebug,
      (res as any).debug?.perStepDebug || (res as any).extraDebug?.perStepDebug
    ];
    for (const c of candidates) if (c) return c;
    return {} as any;
  };

  // Try to extract the first JSON object from a raw string
  const extractFirstJson = (raw: string | undefined) => {
    if (!raw) return null;
    const s = String(raw).replace(/```(?:json)?/g, '');
    const start = s.indexOf('{');
    if (start === -1) return null;
    let inString = false;
    let escape = false;
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = s.substring(start, i + 1);
          try { return JSON.parse(candidate); } catch (e) { return null; }
        }
      }
    }
    return null;
  };

  // Normalize analysis shapes: ensure debug.perStepDebug exists when possible and executedAt is set
  const normalizeAnalysis = (a: any) => {
    if (!a) return a;
    a.debug = a.debug || (a.extraDebug || {});
    const per = a.debug?.perStepDebug || a.debug?.per_step_debug || a.perStepDebug || a.extraDebug?.perStepDebug || a.per_step_debug;
    if (per && !a.debug.perStepDebug) a.debug.perStepDebug = per;
    if (!a.debug.perStepDebug && a.debug?.rawResponse) {
      const parsed = extractFirstJson(a.debug.rawResponse) || null;
      const ts = a.savedAt || a.executedAt || new Date().toISOString();
      a.debug.perStepDebug = {
        fact: {
          prompt: a.debug.prompt || a.debug.debugPrompt || '',
          raw: a.debug.rawResponse,
          parsed,
          startedAt: ts,
          finishedAt: ts,
          durationMs: 0,
          status: parsed ? 'success' : 'failed'
        }
      };
    }
    a.executedAt = a.executedAt || a.debug?.executedAt || (a.debug.perStepDebug && (a.debug.perStepDebug.fact?.finishedAt || a.debug.perStepDebug.agent1_factSheet?.finishedAt));
    return a;
  };

  // Debug logs removed for production; use a logger if needed

  // Parse existing analysis if available on load
  useEffect(() => {
    if (application.aiAnalysis) {
      try {
        const parsed = JSON.parse(application.aiAnalysis);
        // Normalize debug shape to ensure UI can find per-step data
        setAnalysisResult(normalizeAnalysis(parsed));
      } catch (e) {
        console.error("Failed to parse saved AI analysis", e);
        // If stored AI analysis can't be parsed, clear it to avoid crashes
        setAnalysisResult(null);
      }
    }
  }, [application.aiAnalysis]);

  // Load persisted analysis on component mount
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const analysisKey = `analysis_${application.id}`;
        const savedAnalysis = await getAnalysis(analysisKey);
        if (savedAnalysis) {
          try {
            setAnalysisResult(normalizeAnalysis(savedAnalysis));
          } catch (e) {
            setAnalysisResult(savedAnalysis);
          }
        }
      } catch (error) {
        console.error('Failed to load admin analysis:', error);
      }
    };
    loadAnalysis();
  }, [application.id]);

  const handleRunAI = async () => {
    try {
      setIsAnalyzing(true);
      // Pass matched fact sheet to the analysis service
      const result = await analyzeApplicationServer(application, matchedFactSheet);
      // Normalize incoming result to a consistent shape
      setAnalysisResult(normalizeAnalysis(result));
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateStatus = (status: ApplicationStatus) => {
    onUpdate({
      ...application,
      status,
      adminNotes,
      aiAnalysis: analysisResult ? JSON.stringify(analysisResult) : application.aiAnalysis
    });
    onBack();
  };

  // Save analysis result to file-based storage via API
  const savePersistentAnalysis = async (analysis: AIAnalysisResult) => {
    try {
      const analysisKey = `analysis_${application.id}`;
      await saveAnalysis(analysisKey, analysis);
    } catch (error) {
      console.error('Failed to save admin analysis to server:', error);
    }
  };

  // Call savePersistentAnalysis whenever analysisResult is updated
  useEffect(() => {
    if (analysisResult) {
      savePersistentAnalysis(analysisResult);
    }
  }, [analysisResult]);

  // Small render helpers to keep JSX stable and avoid inline IIFE complexity
  const FactSection = () => {
    const parsed = getPerStepDebug(analysisResult).fact?.parsed || null;
    return (
      <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">Fact Sheet Analysis</h4>
        <div className="text-sm text-slate-300">
          {analysisResult?.factSheetSummary ? (
            <p>{analysisResult.factSheetSummary}</p>
          ) : parsed ? (
            parsed.summary && typeof parsed.summary === 'string' ? (
              <p>{parsed.summary}</p>
            ) : (() => {
              const ir = parsed.internalRecordValidation || parsed.internal_record_validation || null;
              if (ir) {
                if (ir.recordFound) {
                  const acc = ir.accountNumber || 'unknown account';
                  const overdue = (typeof ir.overdueBalance === 'number' && ir.overdueBalance > 0) ? `Outstanding balance $${ir.overdueBalance}` : 'No overdue balance';
                  const status = ir.statusMatch ? 'Status matches' : 'Status mismatch';
                  return <p>{`Matched internal record (${acc}). ${overdue}. ${status}.`}</p>;
                }
                return <p>No matching internal fact sheet found — treat as HIGH RISK.</p>;
              }
              return <pre className="whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>;
            })()
          ) : (
            <p className="text-slate-500">No fact sheet analysis available.</p>
          )}
        </div>
      </div>
    );
  };

  const PolicySection = () => {
    const per = getPerStepDebug(analysisResult);
    const policyParsed = per.policy?.parsed || per.agent2_policy?.parsed || null;
    const policyStatus = per.policy?.status || per.agent2_policy?.status || null;
    if (policyStatus === 'disabled') {
      return (
        <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50 opacity-50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Policy Violations [ANALYSIS DISABLED]</h4>
          <div className="text-sm text-slate-400 italic">
            <p>Policy analysis step is currently disabled for debugging.</p>
            <p className="mt-2 text-xs">This section will analyze policy violations and certification requirements once re-enabled.</p>
          </div>
        </div>
      );
    }
    if (policyParsed) {
      const ca = policyParsed.certificationAnalysis || policyParsed.certification_analysis || analysisResult?.certificationAnalysis || null;
      const violations = policyParsed.policyViolations || policyParsed.policy_violations || analysisResult?.policyViolations || [];
      return (
        <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Policy Violations</h4>
          <div className="text-sm text-slate-300">
            {policyParsed.summary && typeof policyParsed.summary === 'string' ? <p>{policyParsed.summary}</p> : null}
            {ca ? (
              <p>{`Certification compliance: ${ca.complianceRatio != null ? `${(ca.complianceRatio*100).toFixed(0)}%` : 'unknown'}. Meets requirement: ${ca.meetsRequirement ? 'Yes' : 'No'}.`}</p>
            ) : null}
            {violations && violations.length ? (
              <div className="mt-2">
                <div className="text-xs text-slate-500 mb-1">Policy Violations Found:</div>
                <ul className="list-disc list-inside text-sm text-slate-300">
                  {violations.slice(0,5).map((v: any, i: number) => <li key={i}>{v.field || JSON.stringify(v)}</li>)}
                </ul>
              </div>
            ) : (
              <p className="mt-2">No policy violations detected.</p>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">Policy Violations</h4>
        <div className="text-sm text-slate-400 italic">
          <p>No policy analysis available.</p>
        </div>
      </div>
    );
  };

  const WebSection = () => {
    const per = getPerStepDebug(analysisResult);
    const webParsed = per.web?.parsed || per.agent3_webSearch?.parsed || null;
    const webStatus = per.web?.status || per.agent3_webSearch?.status || null;
    if (webStatus === 'disabled') {
      return (
        <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50 opacity-50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary [ANALYSIS DISABLED]</h4>
          <div className="text-sm text-slate-400 italic">
            <p>Web search step is currently disabled for debugging.</p>
            <p className="mt-2 text-xs">This section will perform web searches for company information once re-enabled.</p>
          </div>
        </div>
      );
    }
    if (webParsed) {
      if (webParsed.searchSummary && typeof webParsed.searchSummary === 'string') return (
        <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary</h4>
          <div className="text-sm text-slate-300"><p>{webParsed.searchSummary}</p></div>
        </div>
      );
      const wp = webParsed.webPresenceValidation || webParsed.web_presence_validation || null;
      const gv = webParsed.geographicValidation || webParsed.geographic_validation || null;
      return (
        <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary</h4>
          <div className="text-sm text-slate-300">
            {wp ? (
              <p>{wp.companyFound ? `Public web presence found. Industry relevance: ${wp.relevantIndustry ? 'Yes' : 'No'}.` : 'No public web presence found.'}</p>
            ) : gv ? (
              <p>{gv.addressExistsInBC ? `Address verified in BC (${gv.verifiedLocation || 'unknown'}).` : 'Address not verified in BC.'}</p>
            ) : (
              <pre className="whitespace-pre-wrap">{JSON.stringify(webParsed, null, 2)}</pre>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary</h4>
        <div className="text-sm text-slate-400 italic">
          <p>No web profile analysis available.</p>
        </div>
      </div>
    );
  };

  const DebugPanels = () => (
    analysisResult?.debug ? (
      <div className="mt-4">
        <div className="space-y-4">
          {/* Fact, Policy, Web debug panels (kept compact) */}
          {showFactDebug && (
            <div className="p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner">
              <div className="mb-4 pb-3 border-b border-slate-800">
                <div className="text-xs text-slate-500">Executed at: <strong className="text-slate-300">{analysisResult.executedAt || analysisResult.debug?.executedAt || 'unknown'}</strong></div>
              </div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(getPerStepDebug(analysisResult).fact || {}, null, 2)}</pre>
            </div>
          )}
          {showPolicyDebug && (
            <div className="p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner">
              <pre className="whitespace-pre-wrap">{JSON.stringify(getPerStepDebug(analysisResult).policy || {}, null, 2)}</pre>
            </div>
          )}
          {showWebDebug && (
            <div className="p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner">
              <pre className="whitespace-pre-wrap">{JSON.stringify(getPerStepDebug(analysisResult).web || {}, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Column: Main Content Flow */}
        <div className="flex-1 space-y-8 min-w-0">
          
          {/* 1. Header & Basic App Details */}
          <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                <h1 className="text-3xl font-bold text-slate-900">{application.companyName}</h1>
                <p className="text-slate-500 mt-1">Application ID: {application.id}</p>
                </div>
                <Badge color={application.status === 'Approved' ? 'green' : 'blue'}>{application.status}</Badge>
            </div>

            <Card title="Applicant Information">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                    <dt className="text-sm font-medium text-slate-500">Applicant Name</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.applicantName}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium text-slate-500">License Type</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.licenseType}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium text-slate-500">Email</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.email}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium text-slate-500">Phone</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.phone}</dd>
                </div>
                <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-slate-500">Address</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.address}</dd>
                </div>
                </dl>
            </Card>

            <Card title="Safety History">
                <dl className="grid grid-cols-1 gap-y-6">
                <div>
                    <dt className="text-sm font-medium text-slate-500">Years of Experience</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.safetyHistory.yearsExperience} Years</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium text-slate-500">Insurance Expiry</dt>
                    <dd className="mt-1 text-sm text-slate-900">{application.safetyHistory.insuranceExpiry}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium text-slate-500">Violations Record</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                    {application.safetyHistory.hasViolations ? (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800">
                        <div className="font-semibold flex items-center mb-1">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Violation Reported
                        </div>
                        {application.safetyHistory.violationDetails}
                        </div>
                    ) : (
                        <span className="flex items-center text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        No violations reported in last 5 years
                        </span>
                    )}
                    </dd>
                </div>
                </dl>
            </Card>

            {/* Full Application Details (Wizard Data) */}
            {application.wizardData && (
                <div className="pt-4 border-t border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Submitted Application Details</h2>
                    <ApplicationSummary data={application.wizardData} />
                </div>
            )}
          </div>

          {/* 2. Employer Fact Sheet Match */}
          {matchedFactSheet ? (
            <div className="bg-white rounded-lg border-l-4 border-l-blue-600 border border-slate-200 shadow-sm p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                    Employer Fact Sheet Match
                 </h3>
                  {/* Web Profile Summary is rendered below the header */}
                    <span className="block text-slate-500">Legal Name</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.employerLegalName}</span>
                 </div>
                 {/* Render Web Profile Summary below the header to avoid JSX adjacency issues */}
                 {(() => {
                   const per = getPerStepDebug(analysisResult);
                   const webParsed = per.web?.parsed || per.agent3_webSearch?.parsed || null;
                   const webStatus = per.web?.status || per.agent3_webSearch?.status || null;
                   if (webStatus === 'disabled') {
                     return (
                       <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50 opacity-50">
                         <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary [ANALYSIS DISABLED]</h4>
                         <div className="text-sm text-slate-400 italic">
                           <p>Web search step is currently disabled for debugging.</p>
                           <p className="mt-2 text-xs">This section will perform web searches for company information once re-enabled.</p>
                         </div>
                       </div>
                     );
                   }
                   if (webParsed) {
                     if (webParsed.searchSummary && typeof webParsed.searchSummary === 'string') return (
                       <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                         <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary</h4>
                         <div className="text-sm text-slate-300"><p>{webParsed.searchSummary}</p></div>
                       </div>
                     );
                     const wp = webParsed.webPresenceValidation || webParsed.web_presence_validation || null;
                     const gv = webParsed.geographicValidation || webParsed.geographic_validation || null;
                     return (
                       <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                         <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary</h4>
                         <div className="text-sm text-slate-300">
                           {wp ? (
                             <p>{wp.companyFound ? `Public web presence found. Industry relevance: ${wp.relevantIndustry ? 'Yes' : 'No'}.` : 'No public web presence found.'}</p>
                           ) : gv ? (
                             <p>{gv.addressExistsInBC ? `Address verified in BC (${gv.verifiedLocation || 'unknown'}).` : 'Address not verified in BC.'}</p>
                           ) : (
                             <pre className="whitespace-pre-wrap">{JSON.stringify(webParsed, null, 2)}</pre>
                           )}
                         </div>
                       </div>
                     );
                   }
                   return (
                     <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                       <h4 className="text-sm font-semibold text-slate-200 mb-2">Web Profile Summary</h4>
                       <div className="text-sm text-slate-400 italic">
                         <p>No web profile analysis available.</p>
                       </div>
                     </div>
                   );
                 })()}
                 <div>
                    <span className="block text-slate-500">Trade Name</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.employerTradeName || 'N/A'}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Classification Unit</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.classificationUnit}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Firm Type</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.firmType}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Account Coverage</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.accountCoverage}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Account Balance</span>
                    <span className={`font-medium ${matchedFactSheet.currentAccountBalance > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                        ${matchedFactSheet.currentAccountBalance.toFixed(2)}
                    </span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Overdue Balance</span>
                    <span className={`font-medium flex items-center ${matchedFactSheet.overdueBalance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        ${matchedFactSheet.overdueBalance.toFixed(2)}
                        {matchedFactSheet.overdueBalance > 0 && <AlertOctagon className="w-3 h-3 ml-1" />}
                    </span>
                 </div>

                 {/* Safety History Details */}
                 <div>
                    <span className="block text-slate-500">Years of Experience</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.yearsOfExperience || 'N/A'}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Insurance Expiry</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.insuranceExpiry || 'N/A'}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Violations Record</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.violationsRecord || 'N/A'}</span>
                 </div>
              </div>
            ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500">
                <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No matching Employer Fact Sheet found for this company.</p>
            </div>
          )}

          {/* 3. AI Analysis */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg text-white overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-brand-400" />
                <h3 className="font-semibold text-lg">AI Risk Analysis</h3>
                {analysisResult?.policyViolations && analysisResult.policyViolations.length > 0 && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-700 text-red-100">
                    {analysisResult.policyViolations.length} Violation{analysisResult.policyViolations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {!analysisResult && (
                <Button 
                    onClick={handleRunAI} 
                    isLoading={isAnalyzing}
                    className="bg-brand-600 hover:bg-brand-500 text-xs px-3 py-1"
                >
                    Run Analysis
                </Button>
              )}
            </div>
            
            <div className="p-6">
              {isAnalyzing ? (
                <div className="py-12 text-center text-slate-400 animate-pulse">
                  <BrainCircuit className="w-10 h-10 mx-auto mb-4 opacity-50" />
                  <p>Searching web & analyzing application data...</p>
                </div>
              ) : analysisResult ? (
                <>
                <div className="space-y-6">
                  <FactSection />
                  <PolicySection />
                  <WebSection />
                </div>

                <div className="text-right flex justify-end items-center gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowFactDebug(!showFactDebug)}
                          className="text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center"
                        >
                          <Terminal className="w-3 h-3 mr-1" />
                          {showFactDebug ? 'Hide' : 'Show'} Fact Conversation
                        </button>
                        <button
                          onClick={() => setShowPolicyDebug(!showPolicyDebug)}
                          className="text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center"
                        >
                          <Terminal className="w-3 h-3 mr-1" />
                          {showPolicyDebug ? 'Hide' : 'Show'} Policy Conversation
                        </button>
                        <button
                          onClick={() => setShowWebDebug(!showWebDebug)}
                          className="text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center"
                        >
                          <Terminal className="w-3 h-3 mr-1" />
                          {showWebDebug ? 'Hide' : 'Show'} Web Conversation
                        </button>
                      </div>
                    <button 
                        onClick={async () => {
                            // Clear in-memory state
                            setAnalysisResult(null);
                            setShowFactDebug(false);
                            setShowPolicyDebug(false);
                            setShowWebDebug(false);
                            // Clear persisted analysis from server
                            try {
                              const analysisKey = `analysis_${application.id}`;
                              await deleteAnalysis(analysisKey);
                            } catch (error) {
                              console.error('Failed to clear saved analysis:', error);
                            }
                        }}
                        className="text-xs text-slate-500 hover:text-white underline transition-colors"
                    >
                        Reset Analysis
                    </button>
                  </div>

                  {/* Per-agent debug panels (render only when their toggles are active) */}
                  {analysisResult.debug && (
                    <div className="mt-4">
                      <div className="space-y-4">
                        {showFactDebug && (() => {
                          const per = getPerStepDebug(analysisResult);
                          const fact = per.fact || per.agent1_factSheet || per.agent1 || per.agent1_fact || null;
                          if (!fact) {
                            return (
                              <div className="p-4 bg-black/70 rounded border border-slate-700 font-mono text-[11px] text-slate-400">Fact debug not available.</div>
                            );
                          }
                          return (
                            <div className="p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn">
                              <div className="mb-4 pb-3 border-b border-slate-800">
                                <div className="text-xs text-slate-500">Executed at: <strong className="text-slate-300">{analysisResult.executedAt || (analysisResult.debug?.executedAt ? analysisResult.debug.executedAt : 'unknown')}</strong></div>
                              </div>
                              <div className="mb-3">
                                <strong className="text-green-400 block mb-2 border-b border-slate-800 pb-1">FACT PROMPT</strong>
                                {fact.prompt ? <pre className="whitespace-pre-wrap">{fact.prompt}</pre> : <pre className="whitespace-pre-wrap">{analysisResult.debug.prompt || ''}</pre>}
                              </div>
                              <div>
                                <strong className="text-brand-400 block mb-2 border-b border-slate-800 pb-1">FACT RAW RESPONSE</strong>
                                <div className="text-[11px] text-slate-400 mb-2">
                                  <span className="mr-3">Status: {fact.parsed ? <span className="text-green-300">Success — parsed JSON</span> : <span className="text-amber-300">Error — parsing failed</span>}</span>
                                  <span className="mr-3">Started: {fact.startedAt}</span>
                                  <span className="mr-3">Duration: {fact.durationMs ? `${fact.durationMs}ms` : 'n/a'}</span>
                                </div>
                                <pre className="whitespace-pre-wrap">{fact.raw}</pre>
                                {fact.parsed && (
                                  <div className="mt-2">
                                    <div className="text-xs text-slate-500 mb-1">Parsed JSON:</div>
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(fact.parsed, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {showPolicyDebug && (() => {
                          const per = getPerStepDebug(analysisResult);
                          const policy = per.policy || per.agent2_policy || per.agent2 || null;
                          if (!policy) return (
                            <div className="p-4 bg-black/70 rounded border border-slate-700 font-mono text-[11px] text-slate-400">Policy debug not available.</div>
                          );
                          return (
                            <div className="p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn">
                              <div className="mb-3">
                                <strong className="text-green-400 block mb-2 border-b border-slate-800 pb-1">POLICY PROMPT</strong>
                                {policy.prompt ? <pre className="whitespace-pre-wrap">{policy.prompt}</pre> : <pre className="whitespace-pre-wrap">(no prompt captured)</pre>}
                              </div>
                              <div>
                                <strong className="text-brand-400 block mb-2 border-b border-slate-800 pb-1">POLICY RAW RESPONSE</strong>
                                <div className="text-[11px] text-slate-400 mb-2">
                                  <span className="mr-3">Status: {policy.parsed ? <span className="text-green-300">Success — parsed JSON</span> : <span className="text-amber-300">Error — parsing failed</span>}</span>
                                  <span className="mr-3">Started: {policy.startedAt}</span>
                                  <span className="mr-3">Duration: {policy.durationMs ? `${policy.durationMs}ms` : 'n/a'}</span>
                                </div>
                                <pre className="whitespace-pre-wrap">{policy.raw}</pre>
                                {policy.parsed && (
                                  <div className="mt-2">
                                    <div className="text-xs text-slate-500 mb-1">Parsed JSON:</div>
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(policy.parsed, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {showWebDebug && (() => {
                          const per = getPerStepDebug(analysisResult);
                          const web = per.web || per.agent3_webSearch || per.agent3 || null;
                          if (!web) return (
                            <div className="p-4 bg-black/70 rounded border border-slate-700 font-mono text-[11px] text-slate-400">Web debug not available.</div>
                          );
                          return (
                            <div className="p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn">
                              <div className="mb-3">
                                <strong className="text-green-400 block mb-2 border-b border-slate-800 pb-1">WEB PROMPT</strong>
                                {web.prompt ? <pre className="whitespace-pre-wrap">{web.prompt}</pre> : <pre className="whitespace-pre-wrap">(no prompt captured)</pre>}
                              </div>
                              <div>
                                <strong className="text-brand-400 block mb-2 border-b border-slate-800 pb-1">WEB RAW RESPONSE</strong>
                                <div className="text-[11px] text-slate-400 mb-2">
                                  <span className="mr-3">Status: {web.parsed ? <span className="text-green-300">Success — parsed JSON</span> : <span className="text-amber-300">Error — parsing failed</span>}</span>
                                  <span className="mr-3">Started: {web.startedAt}</span>
                                  <span className="mr-3">Duration: {web.durationMs ? `${web.durationMs}ms` : 'n/a'}</span>
                                </div>
                                <pre className="whitespace-pre-wrap">{web.raw}</pre>
                                {web.parsed && (
                                  <div className="mt-2">
                                    <div className="text-xs text-slate-500 mb-1">Parsed JSON:</div>
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(web.parsed, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Click 'Run Analysis' to have Gemini review this application for risk factors and search the web for company details.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Actions (Sticky) */}
        <div className="w-full lg:w-80 sticky top-24">
            <Card title="Review Actions" className="border-t-4 border-t-brand-500 shadow-md">
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notes</label>
                      <textarea 
                          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                          rows={6}
                          placeholder="Enter internal notes regarding this decision..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                      />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                      <Button 
                          onClick={() => updateStatus(ApplicationStatus.APPROVED)}
                          className="bg-green-600 hover:bg-green-700 w-full justify-between group py-3"
                      >
                          Approve License <CheckCircle className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                      </Button>
                      <Button 
                          onClick={() => updateStatus(ApplicationStatus.NEEDS_INFO)}
                          className="bg-amber-500 hover:bg-amber-600 w-full justify-between group text-white py-3"
                      >
                          Request Info <MessageSquare className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                      </Button>
                      <Button 
                          onClick={() => updateStatus(ApplicationStatus.REJECTED)}
                          variant="danger"
                          className="w-full justify-between group py-3"
                      >
                          Reject Application <XCircle className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                      </Button>
                  </div>
              </div>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplicationReview;
