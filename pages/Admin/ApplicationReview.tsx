
import React, { useState } from 'react';
import { LicenseApplication, ApplicationStatus, AIAnalysisResult } from '../../types';
import { Button, Card, Badge } from '../../components/UI';
import { analyzeApplication } from '../../services/geminiService';
import { ArrowLeft, BrainCircuit, CheckCircle, XCircle, FileText, AlertTriangle, MessageSquare } from 'lucide-react';

interface ApplicationReviewProps {
  application: LicenseApplication;
  onUpdate: (app: LicenseApplication) => void;
  onBack: () => void;
}

const ApplicationReview: React.FC<ApplicationReviewProps> = ({ application, onUpdate, onBack }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [adminNotes, setAdminNotes] = useState(application.adminNotes || '');

  const handleRunAI = async () => {
    try {
      setIsAnalyzing(true);
      const result = await analyzeApplication(application);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Application Details */}
        <div className="flex-1 space-y-6">
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

          <Card title="Documents">
            <ul className="divide-y divide-slate-100">
              {application.documents.map(doc => (
                <li key={doc.id} className="py-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-slate-400 mr-3" />
                    <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                  </div>
                  <Button variant="outline" className="text-xs px-2 py-1 h-auto">View</Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column: Actions & AI */}
        <div className="w-full lg:w-96 space-y-6">
          
          {/* AI Analysis Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg text-white overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-brand-400" />
                <h3 className="font-semibold">AI Risk Analysis</h3>
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
            
            <div className="p-4">
              {isAnalyzing ? (
                <div className="py-8 text-center text-slate-400 animate-pulse">
                  Analyzing compliance data...
                </div>
              ) : analysisResult ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Risk Score:</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      analysisResult.riskScore === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 
                      analysisResult.riskScore === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                      'bg-green-500/20 text-green-300 border border-green-500/50'
                    }`}>
                      {analysisResult.riskScore} RISK
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {analysisResult.summary}
                    </p>
                    
                    {analysisResult.concerns.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Concerns</span>
                        <ul className="mt-1 space-y-1">
                          {analysisResult.concerns.map((c, i) => (
                            <li key={i} className="text-xs text-red-300 flex items-start">
                              <span className="mr-1.5">•</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="bg-slate-700/50 rounded p-3 mt-4">
                      <span className="text-xs uppercase text-brand-400 font-bold tracking-wider block mb-1">Recommendation</span>
                      <p className="text-sm text-white font-medium">{analysisResult.recommendation}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setAnalysisResult(null)}
                    className="text-xs text-slate-500 hover:text-white underline w-full text-center"
                  >
                    Reset Analysis
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Click 'Run Analysis' to have Gemini review this application for risk factors and completeness.
                </div>
              )}
            </div>
          </div>

          {/* Action Card */}
          <Card title="Review Actions" className="border-t-4 border-t-brand-500">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notes</label>
                    <textarea 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        rows={4}
                        placeholder="Internal notes regarding this decision..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 gap-2">
                    <Button 
                        onClick={() => updateStatus(ApplicationStatus.APPROVED)}
                        className="bg-green-600 hover:bg-green-700 w-full justify-between group"
                    >
                        Approve License <CheckCircle className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    </Button>
                    <Button 
                        onClick={() => updateStatus(ApplicationStatus.NEEDS_INFO)}
                        className="bg-amber-500 hover:bg-amber-600 w-full justify-between group text-white"
                    >
                        Request Info <MessageSquare className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    </Button>
                    <Button 
                        onClick={() => updateStatus(ApplicationStatus.REJECTED)}
                        variant="danger"
                        className="w-full justify-between group"
                    >
                        Reject Application <XCircle className="w-4 h-4 opacity-70 group-hover:opacity-100" />
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
