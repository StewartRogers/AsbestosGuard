import React, { useState, useEffect } from 'react';
import { LicenseApplication, ApplicationStatus, AIAnalysisResult, EmployerFactSheet } from '../../types';
import { Button, Card, Badge } from '../../components/UI';
import { ApplicationSummary } from '../../components/ApplicationSummary';
import { analyzeApplication } from '../../services/geminiService';
import { ArrowLeft, BrainCircuit, CheckCircle, XCircle, FileText, AlertTriangle, MessageSquare, Building2, TrendingUp, AlertOctagon, Globe, ExternalLink, Database, Terminal } from 'lucide-react';
import { readData, writeData } from '../../services/storageService';

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
  const [showDebug, setShowDebug] = useState(false);

  // Attempt to link application to a Fact Sheet by Account Number only
  const matchedFactSheet = factSheets.find(
    fs => application.wizardData?.firmAccountNumber && fs.employerId === application.wizardData.firmAccountNumber
  );

  // Debug: Log factSheets and matching details
  console.log('ApplicationReview: factSheets count:', factSheets.length);
  console.log('ApplicationReview: application.companyName:', application.companyName);
  console.log('ApplicationReview: application.wizardData?.firmAccountNumber:', application.wizardData?.firmAccountNumber);
  console.log('ApplicationReview: application.wizardData?.firmTradeName:', application.wizardData?.firmTradeName);
  console.log('ApplicationReview: matchedFactSheet:', matchedFactSheet ? 'Found' : 'Not Found', matchedFactSheet);

  // Parse existing analysis if available on load
  useEffect(() => {
    if (application.aiAnalysis) {
      try {
        const parsed = JSON.parse(application.aiAnalysis);
        setAnalysisResult(parsed);
      } catch (e) {
        console.error("Failed to parse saved AI analysis", e);
        setAnalysisResult({ error: "Invalid AI analysis data." }); // Fallback behavior
      }
    }
  }, [application.aiAnalysis]);

  // Load persisted analysis on component mount
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const savedAnalysis = await readData('adminAnalysis');
        if (savedAnalysis) {
          setAnalysisResult(savedAnalysis);
        }
      } catch (error) {
        console.error('Failed to load admin analysis:', error);
      }
    };
    loadAnalysis();
  }, []);

  const handleRunAI = async () => {
    try {
      setIsAnalyzing(true);
      // Pass matched fact sheet to the analysis service
      const result = await analyzeApplication(application, matchedFactSheet);
      setAnalysisResult(result);
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

  // Save analysis result to file
  const saveAnalysis = async (analysis) => {
    try {
      await writeData('adminAnalysis', analysis);
    } catch (error) {
      console.error('Failed to save admin analysis:', error);
    }
  };

  // Call saveAnalysis whenever analysisResult is updated
  useEffect(() => {
    if (analysisResult) {
      saveAnalysis(analysisResult);
    }
  }, [analysisResult]);

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
                 <Badge color={matchedFactSheet.activeStatus === 'Active' ? 'green' : 'gray'}>{matchedFactSheet.activeStatus}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                 <div>
                    <span className="block text-slate-500">Employer ID</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.employerId}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500">Legal Name</span>
                    <span className="font-medium text-slate-900">{matchedFactSheet.employerLegalName}</span>
                 </div>
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
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-lg">
                    <span className="text-slate-300 font-medium">Calculated Risk Score</span>
                    <span className={`px-3 py-1 rounded text-sm font-bold tracking-wide border ${
                      analysisResult.riskScore === 'HIGH' ? 'bg-red-500/20 text-red-300 border-red-500/50' : 
                      analysisResult.riskScore === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
                      'bg-green-500/20 text-green-300 border-green-500/50'
                    }`}>
                      {analysisResult.riskScore} RISK
                    </span>
                  </div>
                  
                  {/* High Level Regulatory Summary */}
                   <div>
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center mb-2">
                        <FileText className="w-3 h-3 mr-1" /> Regulatory Summary
                    </span>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded border border-slate-700/50">
                        {analysisResult.summary}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                      {/* Employer Fact Sheet Summary */}
                      <div>
                        <span className="text-xs uppercase text-blue-400 font-bold tracking-wider flex items-center mb-2">
                            <Database className="w-3 h-3 mr-1" /> Internal Record Check
                        </span>
                        <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded border border-slate-700/50 h-full">
                            {analysisResult.factSheetSummary || "No fact sheet comparison available."}
                        </p>
                      </div>

                      {/* Web Presence Summary */}
                      <div>
                        <span className="text-xs uppercase text-brand-400 font-bold tracking-wider flex items-center mb-2">
                            <Globe className="w-3 h-3 mr-1" /> Public Web Profile
                        </span>
                        <div className="bg-slate-800/30 p-3 rounded border border-slate-700/50 h-full">
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                                {analysisResult.webPresenceSummary || "No web presence summary available."}
                            </p>
                            {analysisResult.sources && analysisResult.sources.length > 0 && (
                                <div className="pt-2 border-t border-slate-700/50">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Sources</span>
                                    <ul className="space-y-1">
                                        {analysisResult.sources.map((s, i) => (
                                            <li key={i}>
                                                <a href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-[11px] text-brand-400 hover:text-brand-300 hover:underline truncate transition-colors">
                                                    <ExternalLink className="w-2.5 h-2.5 mr-1.5 flex-shrink-0" />
                                                    {s.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                      </div>
                  </div>
                  
                  {/* Concerns */}
                  {analysisResult.concerns.length > 0 && (
                    <div>
                      <span className="text-xs uppercase text-red-400 font-bold tracking-wider mb-2 block">Identified Concerns</span>
                      <ul className="grid sm:grid-cols-2 gap-2">
                        {analysisResult.concerns.map((c, i) => (
                          <li key={i} className="text-sm text-red-200 bg-red-900/10 border border-red-900/30 p-2 rounded flex items-start">
                            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Recommendation */}
                  <div className="bg-slate-700 rounded p-4 border border-slate-600">
                    <span className="text-xs uppercase text-brand-400 font-bold tracking-wider block mb-1">AI Recommendation</span>
                    <p className="text-base text-white font-medium">{analysisResult.recommendation}</p>
                  </div>
                  
                  <div className="text-right flex justify-end items-center gap-4">
                     {analysisResult.debug && (
                        <button 
                            onClick={() => setShowDebug(!showDebug)}
                            className="text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center"
                        >
                            <Terminal className="w-3 h-3 mr-1" />
                            {showDebug ? 'Hide' : 'Show'} AI Conversation
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            setAnalysisResult(null);
                            setShowDebug(false);
                        }}
                        className="text-xs text-slate-500 hover:text-white underline transition-colors"
                    >
                        Reset Analysis
                    </button>
                  </div>

                  {/* Debug View */}
                  {showDebug && analysisResult.debug && (
                    <div className="mt-4 p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn">
                        <div className="mb-6">
                            <strong className="text-green-400 block mb-2 border-b border-slate-800 pb-1">PROMPT SENT TO GEMINI:</strong>
                            <pre className="whitespace-pre-wrap">{analysisResult.debug.prompt}</pre>
                        </div>
                        <div>
                            <strong className="text-brand-400 block mb-2 border-b border-slate-800 pb-1">RAW RESPONSE FROM GEMINI:</strong>
                            <pre className="whitespace-pre-wrap">{analysisResult.debug.rawResponse}</pre>
                        </div>
                    </div>
                  )}

                </div>
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
