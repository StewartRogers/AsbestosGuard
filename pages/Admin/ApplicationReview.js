import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { ApplicationStatus } from '../../types';
import { Button, Card, Badge } from '../../components/UI';
import { ApplicationSummary } from '../../components/ApplicationSummary';
import { analyzeApplicationServer } from '../../services/foundryClient';
import { ArrowLeft, BrainCircuit, CheckCircle, XCircle, AlertTriangle, MessageSquare, Building2, AlertOctagon, Terminal } from 'lucide-react';
import { saveAnalysis, getAnalysis, deleteAnalysis } from '../../services/apiService';
const ApplicationReview = ({ application, factSheets, onUpdate, onBack }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [adminNotes, setAdminNotes] = useState(application.adminNotes || '');
    const [showFactDebug, setShowFactDebug] = useState(false);
    const [showPolicyDebug, setShowPolicyDebug] = useState(false);
    const [showWebDebug, setShowWebDebug] = useState(false);
    // Attempt to link application to a Fact Sheet by Account Number only
    const matchedFactSheet = factSheets.find(fs => application.wizardData?.firmAccountNumber && fs.employerId === application.wizardData.firmAccountNumber);
    // Helper to find per-step debug in multiple possible shapes (defensive)
    const getPerStepDebug = (res) => {
        if (!res)
            return {};
        // Try common locations
        const candidates = [
            res.debug?.perStepDebug,
            res.debug?.per_step_debug,
            res.perStepDebug,
            res.per_step_debug,
            res.extraDebug?.perStepDebug,
            res.debug?.extraDebug?.perStepDebug,
            res.debug?.perStepDebug || res.extraDebug?.perStepDebug
        ];
        for (const c of candidates)
            if (c)
                return c;
        return {};
    };
    // Try to extract the first JSON object from a raw string
    const extractFirstJson = (raw) => {
        if (!raw)
            return null;
        const s = String(raw).replace(/```(?:json)?/g, '');
        const start = s.indexOf('{');
        if (start === -1)
            return null;
        let inString = false;
        let escape = false;
        let depth = 0;
        for (let i = start; i < s.length; i++) {
            const ch = s[i];
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '"') {
                inString = !inString;
                continue;
            }
            if (inString)
                continue;
            if (ch === '{')
                depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) {
                    const candidate = s.substring(start, i + 1);
                    try {
                        return JSON.parse(candidate);
                    }
                    catch (e) {
                        return null;
                    }
                }
            }
        }
        return null;
    };
    // Normalize analysis shapes: ensure debug.perStepDebug exists when possible and executedAt is set
    const normalizeAnalysis = (a) => {
        if (!a)
            return a;
        a.debug = a.debug || (a.extraDebug || {});
        const per = a.debug?.perStepDebug || a.debug?.per_step_debug || a.perStepDebug || a.extraDebug?.perStepDebug || a.per_step_debug;
        if (per && !a.debug.perStepDebug)
            a.debug.perStepDebug = per;
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
            }
            catch (e) {
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
                    }
                    catch (e) {
                        setAnalysisResult(savedAnalysis);
                    }
                }
            }
            catch (error) {
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
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setIsAnalyzing(false);
        }
    };
    const updateStatus = (status) => {
        onUpdate({
            ...application,
            status,
            adminNotes,
            aiAnalysis: analysisResult ? JSON.stringify(analysisResult) : application.aiAnalysis
        });
        onBack();
    };
    // Save analysis result to file-based storage via API
    const savePersistentAnalysis = async (analysis) => {
        try {
            const analysisKey = `analysis_${application.id}`;
            await saveAnalysis(analysisKey, analysis);
        }
        catch (error) {
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
        return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Fact Sheet Analysis" }), _jsx("div", { className: "text-sm text-slate-300", children: analysisResult?.factSheetSummary ? (_jsx("p", { children: analysisResult.factSheetSummary })) : parsed ? (parsed.summary && typeof parsed.summary === 'string' ? (_jsx("p", { children: parsed.summary })) : (() => {
                        const ir = parsed.internalRecordValidation || parsed.internal_record_validation || null;
                        if (ir) {
                            if (ir.recordFound) {
                                const acc = ir.accountNumber || 'unknown account';
                                const overdue = (typeof ir.overdueBalance === 'number' && ir.overdueBalance > 0) ? `Outstanding balance $${ir.overdueBalance}` : 'No overdue balance';
                                const status = ir.statusMatch ? 'Status matches' : 'Status mismatch';
                                return _jsx("p", { children: `Matched internal record (${acc}). ${overdue}. ${status}.` });
                            }
                            return _jsx("p", { children: "No matching internal fact sheet found \u2014 treat as HIGH RISK." });
                        }
                        return _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(parsed, null, 2) });
                    })()) : (_jsx("p", { className: "text-slate-500", children: "No fact sheet analysis available." })) })] }));
    };
    const PolicySection = () => {
        const per = getPerStepDebug(analysisResult);
        const policyParsed = per.policy?.parsed || per.agent2_policy?.parsed || null;
        const policyStatus = per.policy?.status || per.agent2_policy?.status || null;
        if (policyStatus === 'disabled') {
            return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50 opacity-50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Policy Violations [ANALYSIS DISABLED]" }), _jsxs("div", { className: "text-sm text-slate-400 italic", children: [_jsx("p", { children: "Policy analysis step is currently disabled for debugging." }), _jsx("p", { className: "mt-2 text-xs", children: "This section will analyze policy violations and certification requirements once re-enabled." })] })] }));
        }
        if (policyParsed) {
            const ca = policyParsed.certificationAnalysis || policyParsed.certification_analysis || analysisResult?.certificationAnalysis || null;
            const violations = policyParsed.policyViolations || policyParsed.policy_violations || analysisResult?.policyViolations || [];
            return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Policy Violations" }), _jsxs("div", { className: "text-sm text-slate-300", children: [policyParsed.summary && typeof policyParsed.summary === 'string' ? _jsx("p", { children: policyParsed.summary }) : null, ca ? (_jsx("p", { children: `Certification compliance: ${ca.complianceRatio != null ? `${(ca.complianceRatio * 100).toFixed(0)}%` : 'unknown'}. Meets requirement: ${ca.meetsRequirement ? 'Yes' : 'No'}.` })) : null, violations && violations.length ? (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Policy Violations Found:" }), _jsx("ul", { className: "list-disc list-inside text-sm text-slate-300", children: violations.slice(0, 5).map((v, i) => _jsx("li", { children: v.field || JSON.stringify(v) }, i)) })] })) : (_jsx("p", { className: "mt-2", children: "No policy violations detected." }))] })] }));
        }
        return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Policy Violations" }), _jsx("div", { className: "text-sm text-slate-400 italic", children: _jsx("p", { children: "No policy analysis available." }) })] }));
    };
    const WebSection = () => {
        const per = getPerStepDebug(analysisResult);
        const webParsed = per.web?.parsed || per.agent3_webSearch?.parsed || null;
        const webStatus = per.web?.status || per.agent3_webSearch?.status || null;
        if (webStatus === 'disabled') {
            return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50 opacity-50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary [ANALYSIS DISABLED]" }), _jsxs("div", { className: "text-sm text-slate-400 italic", children: [_jsx("p", { children: "Web search step is currently disabled for debugging." }), _jsx("p", { className: "mt-2 text-xs", children: "This section will perform web searches for company information once re-enabled." })] })] }));
        }
        if (webParsed) {
            if (webParsed.searchSummary && typeof webParsed.searchSummary === 'string')
                return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary" }), _jsx("div", { className: "text-sm text-slate-300", children: _jsx("p", { children: webParsed.searchSummary }) })] }));
            const wp = webParsed.webPresenceValidation || webParsed.web_presence_validation || null;
            const gv = webParsed.geographicValidation || webParsed.geographic_validation || null;
            return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary" }), _jsx("div", { className: "text-sm text-slate-300", children: wp ? (_jsx("p", { children: wp.companyFound ? `Public web presence found. Industry relevance: ${wp.relevantIndustry ? 'Yes' : 'No'}.` : 'No public web presence found.' })) : gv ? (_jsx("p", { children: gv.addressExistsInBC ? `Address verified in BC (${gv.verifiedLocation || 'unknown'}).` : 'Address not verified in BC.' })) : (_jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(webParsed, null, 2) })) })] }));
        }
        return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary" }), _jsx("div", { className: "text-sm text-slate-400 italic", children: _jsx("p", { children: "No web profile analysis available." }) })] }));
    };
    const DebugPanels = () => (analysisResult?.debug ? (_jsx("div", { className: "mt-4", children: _jsxs("div", { className: "space-y-4", children: [showFactDebug && (_jsxs("div", { className: "p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner", children: [_jsx("div", { className: "mb-4 pb-3 border-b border-slate-800", children: _jsxs("div", { className: "text-xs text-slate-500", children: ["Executed at: ", _jsx("strong", { className: "text-slate-300", children: analysisResult.executedAt || analysisResult.debug?.executedAt || 'unknown' })] }) }), _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(getPerStepDebug(analysisResult).fact || {}, null, 2) })] })), showPolicyDebug && (_jsx("div", { className: "p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner", children: _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(getPerStepDebug(analysisResult).policy || {}, null, 2) }) })), showWebDebug && (_jsx("div", { className: "p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner", children: _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(getPerStepDebug(analysisResult).web || {}, null, 2) }) }))] }) })) : null);
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8", children: [_jsxs("button", { onClick: onBack, className: "flex items-center text-slate-500 hover:text-slate-900 mb-6", children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-1" }), "Back to Dashboard"] }), _jsxs("div", { className: "flex flex-col lg:flex-row gap-8 items-start", children: [_jsxs("div", { className: "flex-1 space-y-8 min-w-0", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-slate-900", children: application.companyName }), _jsxs("p", { className: "text-slate-500 mt-1", children: ["Application ID: ", application.id] })] }), _jsx(Badge, { color: application.status === 'Approved' ? 'green' : 'blue', children: application.status })] }), _jsx(Card, { title: "Applicant Information", children: _jsxs("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Applicant Name" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.applicantName })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "License Type" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.licenseType })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Email" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.email })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Phone" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.phone })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Address" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.address })] })] }) }), _jsx(Card, { title: "Safety History", children: _jsxs("dl", { className: "grid grid-cols-1 gap-y-6", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Years of Experience" }), _jsxs("dd", { className: "mt-1 text-sm text-slate-900", children: [application.safetyHistory.yearsExperience, " Years"] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Insurance Expiry" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.safetyHistory.insuranceExpiry })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-sm font-medium text-slate-500", children: "Violations Record" }), _jsx("dd", { className: "mt-1 text-sm text-slate-900", children: application.safetyHistory.hasViolations ? (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-3 text-red-800", children: [_jsxs("div", { className: "font-semibold flex items-center mb-1", children: [_jsx(AlertTriangle, { className: "w-4 h-4 mr-2" }), "Violation Reported"] }), application.safetyHistory.violationDetails] })) : (_jsxs("span", { className: "flex items-center text-green-700", children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-2" }), "No violations reported in last 5 years"] })) })] })] }) }), application.wizardData && (_jsxs("div", { className: "pt-4 border-t border-slate-200", children: [_jsx("h2", { className: "text-xl font-bold text-slate-900 mb-6", children: "Submitted Application Details" }), _jsx(ApplicationSummary, { data: application.wizardData })] }))] }), matchedFactSheet ? (_jsxs("div", { className: "bg-white rounded-lg border-l-4 border-l-blue-600 border border-slate-200 shadow-sm p-6 animate-fadeIn", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-slate-900 flex items-center", children: [_jsx(Building2, { className: "w-5 h-5 text-blue-600 mr-2" }), "Employer Fact Sheet Match"] }), _jsx("span", { className: "block text-slate-500", children: "Legal Name" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.employerLegalName })] }), (() => {
                                        const per = getPerStepDebug(analysisResult);
                                        const webParsed = per.web?.parsed || per.agent3_webSearch?.parsed || null;
                                        const webStatus = per.web?.status || per.agent3_webSearch?.status || null;
                                        if (webStatus === 'disabled') {
                                            return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50 opacity-50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary [ANALYSIS DISABLED]" }), _jsxs("div", { className: "text-sm text-slate-400 italic", children: [_jsx("p", { children: "Web search step is currently disabled for debugging." }), _jsx("p", { className: "mt-2 text-xs", children: "This section will perform web searches for company information once re-enabled." })] })] }));
                                        }
                                        if (webParsed) {
                                            if (webParsed.searchSummary && typeof webParsed.searchSummary === 'string')
                                                return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary" }), _jsx("div", { className: "text-sm text-slate-300", children: _jsx("p", { children: webParsed.searchSummary }) })] }));
                                            const wp = webParsed.webPresenceValidation || webParsed.web_presence_validation || null;
                                            const gv = webParsed.geographicValidation || webParsed.geographic_validation || null;
                                            return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary" }), _jsx("div", { className: "text-sm text-slate-300", children: wp ? (_jsx("p", { children: wp.companyFound ? `Public web presence found. Industry relevance: ${wp.relevantIndustry ? 'Yes' : 'No'}.` : 'No public web presence found.' })) : gv ? (_jsx("p", { children: gv.addressExistsInBC ? `Address verified in BC (${gv.verifiedLocation || 'unknown'}).` : 'Address not verified in BC.' })) : (_jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(webParsed, null, 2) })) })] }));
                                        }
                                        return (_jsxs("div", { className: "bg-slate-800/30 p-4 rounded border border-slate-700/50", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200 mb-2", children: "Web Profile Summary" }), _jsx("div", { className: "text-sm text-slate-400 italic", children: _jsx("p", { children: "No web profile analysis available." }) })] }));
                                    })(), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Trade Name" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.employerTradeName || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Classification Unit" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.classificationUnit })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Firm Type" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.firmType })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Account Coverage" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.accountCoverage })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Account Balance" }), _jsxs("span", { className: `font-medium ${matchedFactSheet.currentAccountBalance > 0 ? 'text-green-600' : 'text-slate-900'}`, children: ["$", matchedFactSheet.currentAccountBalance.toFixed(2)] })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Overdue Balance" }), _jsxs("span", { className: `font-medium flex items-center ${matchedFactSheet.overdueBalance > 0 ? 'text-red-600' : 'text-slate-900'}`, children: ["$", matchedFactSheet.overdueBalance.toFixed(2), matchedFactSheet.overdueBalance > 0 && _jsx(AlertOctagon, { className: "w-3 h-3 ml-1" })] })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Years of Experience" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.yearsOfExperience || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Insurance Expiry" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.insuranceExpiry || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-slate-500", children: "Violations Record" }), _jsx("span", { className: "font-medium text-slate-900", children: matchedFactSheet.violationsRecord || 'N/A' })] })] })) : (_jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500", children: [_jsx(Building2, { className: "w-8 h-8 mx-auto text-slate-300 mb-2" }), _jsx("p", { children: "No matching Employer Fact Sheet found for this company." })] })), _jsxs("div", { className: "bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg text-white overflow-hidden animate-fadeIn", children: [_jsxs("div", { className: "p-4 border-b border-slate-700 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BrainCircuit, { className: "w-5 h-5 text-brand-400" }), _jsx("h3", { className: "font-semibold text-lg", children: "AI Risk Analysis" }), analysisResult?.policyViolations && analysisResult.policyViolations.length > 0 && (_jsxs("span", { className: "ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-700 text-red-100", children: [analysisResult.policyViolations.length, " Violation", analysisResult.policyViolations.length > 1 ? 's' : ''] }))] }), !analysisResult && (_jsx(Button, { onClick: handleRunAI, isLoading: isAnalyzing, className: "bg-brand-600 hover:bg-brand-500 text-xs px-3 py-1", children: "Run Analysis" }))] }), _jsx("div", { className: "p-6", children: isAnalyzing ? (_jsxs("div", { className: "py-12 text-center text-slate-400 animate-pulse", children: [_jsx(BrainCircuit, { className: "w-10 h-10 mx-auto mb-4 opacity-50" }), _jsx("p", { children: "Searching web & analyzing application data..." })] })) : analysisResult ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-6", children: [_jsx(FactSection, {}), _jsx(PolicySection, {}), _jsx(WebSection, {})] }), _jsxs("div", { className: "text-right flex justify-end items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => setShowFactDebug(!showFactDebug), className: "text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center", children: [_jsx(Terminal, { className: "w-3 h-3 mr-1" }), showFactDebug ? 'Hide' : 'Show', " Fact Conversation"] }), _jsxs("button", { onClick: () => setShowPolicyDebug(!showPolicyDebug), className: "text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center", children: [_jsx(Terminal, { className: "w-3 h-3 mr-1" }), showPolicyDebug ? 'Hide' : 'Show', " Policy Conversation"] }), _jsxs("button", { onClick: () => setShowWebDebug(!showWebDebug), className: "text-xs text-brand-400 hover:text-brand-300 underline transition-colors flex items-center", children: [_jsx(Terminal, { className: "w-3 h-3 mr-1" }), showWebDebug ? 'Hide' : 'Show', " Web Conversation"] })] }), _jsx("button", { onClick: async () => {
                                                                // Clear in-memory state
                                                                setAnalysisResult(null);
                                                                setShowFactDebug(false);
                                                                setShowPolicyDebug(false);
                                                                setShowWebDebug(false);
                                                                // Clear persisted analysis from server
                                                                try {
                                                                    const analysisKey = `analysis_${application.id}`;
                                                                    await deleteAnalysis(analysisKey);
                                                                }
                                                                catch (error) {
                                                                    console.error('Failed to clear saved analysis:', error);
                                                                }
                                                            }, className: "text-xs text-slate-500 hover:text-white underline transition-colors", children: "Reset Analysis" })] }), analysisResult.debug && (_jsx("div", { className: "mt-4", children: _jsxs("div", { className: "space-y-4", children: [showFactDebug && (() => {
                                                                const per = getPerStepDebug(analysisResult);
                                                                const fact = per.fact || per.agent1_factSheet || per.agent1 || per.agent1_fact || null;
                                                                if (!fact) {
                                                                    return (_jsx("div", { className: "p-4 bg-black/70 rounded border border-slate-700 font-mono text-[11px] text-slate-400", children: "Fact debug not available." }));
                                                                }
                                                                return (_jsxs("div", { className: "p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn", children: [_jsx("div", { className: "mb-4 pb-3 border-b border-slate-800", children: _jsxs("div", { className: "text-xs text-slate-500", children: ["Executed at: ", _jsx("strong", { className: "text-slate-300", children: analysisResult.executedAt || (analysisResult.debug?.executedAt ? analysisResult.debug.executedAt : 'unknown') })] }) }), _jsxs("div", { className: "mb-3", children: [_jsx("strong", { className: "text-green-400 block mb-2 border-b border-slate-800 pb-1", children: "FACT PROMPT" }), fact.prompt ? _jsx("pre", { className: "whitespace-pre-wrap", children: fact.prompt }) : _jsx("pre", { className: "whitespace-pre-wrap", children: analysisResult.debug.prompt || '' })] }), _jsxs("div", { children: [_jsx("strong", { className: "text-brand-400 block mb-2 border-b border-slate-800 pb-1", children: "FACT RAW RESPONSE" }), _jsxs("div", { className: "text-[11px] text-slate-400 mb-2", children: [_jsxs("span", { className: "mr-3", children: ["Status: ", fact.parsed ? _jsx("span", { className: "text-green-300", children: "Success \u2014 parsed JSON" }) : _jsx("span", { className: "text-amber-300", children: "Error \u2014 parsing failed" })] }), _jsxs("span", { className: "mr-3", children: ["Started: ", fact.startedAt] }), _jsxs("span", { className: "mr-3", children: ["Duration: ", fact.durationMs ? `${fact.durationMs}ms` : 'n/a'] })] }), _jsx("pre", { className: "whitespace-pre-wrap", children: fact.raw }), fact.parsed && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Parsed JSON:" }), _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(fact.parsed, null, 2) })] }))] })] }));
                                                            })(), showPolicyDebug && (() => {
                                                                const per = getPerStepDebug(analysisResult);
                                                                const policy = per.policy || per.agent2_policy || per.agent2 || null;
                                                                if (!policy)
                                                                    return (_jsx("div", { className: "p-4 bg-black/70 rounded border border-slate-700 font-mono text-[11px] text-slate-400", children: "Policy debug not available." }));
                                                                return (_jsxs("div", { className: "p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn", children: [_jsxs("div", { className: "mb-3", children: [_jsx("strong", { className: "text-green-400 block mb-2 border-b border-slate-800 pb-1", children: "POLICY PROMPT" }), policy.prompt ? _jsx("pre", { className: "whitespace-pre-wrap", children: policy.prompt }) : _jsx("pre", { className: "whitespace-pre-wrap", children: "(no prompt captured)" })] }), _jsxs("div", { children: [_jsx("strong", { className: "text-brand-400 block mb-2 border-b border-slate-800 pb-1", children: "POLICY RAW RESPONSE" }), _jsxs("div", { className: "text-[11px] text-slate-400 mb-2", children: [_jsxs("span", { className: "mr-3", children: ["Status: ", policy.parsed ? _jsx("span", { className: "text-green-300", children: "Success \u2014 parsed JSON" }) : _jsx("span", { className: "text-amber-300", children: "Error \u2014 parsing failed" })] }), _jsxs("span", { className: "mr-3", children: ["Started: ", policy.startedAt] }), _jsxs("span", { className: "mr-3", children: ["Duration: ", policy.durationMs ? `${policy.durationMs}ms` : 'n/a'] })] }), _jsx("pre", { className: "whitespace-pre-wrap", children: policy.raw }), policy.parsed && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Parsed JSON:" }), _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(policy.parsed, null, 2) })] }))] })] }));
                                                            })(), showWebDebug && (() => {
                                                                const per = getPerStepDebug(analysisResult);
                                                                const web = per.web || per.agent3_webSearch || per.agent3 || null;
                                                                if (!web)
                                                                    return (_jsx("div", { className: "p-4 bg-black/70 rounded border border-slate-700 font-mono text-[11px] text-slate-400", children: "Web debug not available." }));
                                                                return (_jsxs("div", { className: "p-4 bg-black rounded border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner animate-fadeIn", children: [_jsxs("div", { className: "mb-3", children: [_jsx("strong", { className: "text-green-400 block mb-2 border-b border-slate-800 pb-1", children: "WEB PROMPT" }), web.prompt ? _jsx("pre", { className: "whitespace-pre-wrap", children: web.prompt }) : _jsx("pre", { className: "whitespace-pre-wrap", children: "(no prompt captured)" })] }), _jsxs("div", { children: [_jsx("strong", { className: "text-brand-400 block mb-2 border-b border-slate-800 pb-1", children: "WEB RAW RESPONSE" }), _jsxs("div", { className: "text-[11px] text-slate-400 mb-2", children: [_jsxs("span", { className: "mr-3", children: ["Status: ", web.parsed ? _jsx("span", { className: "text-green-300", children: "Success \u2014 parsed JSON" }) : _jsx("span", { className: "text-amber-300", children: "Error \u2014 parsing failed" })] }), _jsxs("span", { className: "mr-3", children: ["Started: ", web.startedAt] }), _jsxs("span", { className: "mr-3", children: ["Duration: ", web.durationMs ? `${web.durationMs}ms` : 'n/a'] })] }), _jsx("pre", { className: "whitespace-pre-wrap", children: web.raw }), web.parsed && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Parsed JSON:" }), _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(web.parsed, null, 2) })] }))] })] }));
                                                            })()] }) }))] })) : (_jsx("div", { className: "text-center py-6 text-slate-400 text-sm", children: "Click 'Run Analysis' to have Gemini review this application for risk factors and search the web for company details." })) })] })] }), _jsx("div", { className: "w-full lg:w-80 sticky top-24", children: _jsx(Card, { title: "Review Actions", className: "border-t-4 border-t-brand-500 shadow-md", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Admin Notes" }), _jsx("textarea", { className: "w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm", rows: 6, placeholder: "Enter internal notes regarding this decision...", value: adminNotes, onChange: (e) => setAdminNotes(e.target.value) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-3", children: [_jsxs(Button, { onClick: () => updateStatus(ApplicationStatus.APPROVED), className: "bg-green-600 hover:bg-green-700 w-full justify-between group py-3", children: ["Approve License ", _jsx(CheckCircle, { className: "w-5 h-5 opacity-70 group-hover:opacity-100" })] }), _jsxs(Button, { onClick: () => updateStatus(ApplicationStatus.NEEDS_INFO), className: "bg-amber-500 hover:bg-amber-600 w-full justify-between group text-white py-3", children: ["Request Info ", _jsx(MessageSquare, { className: "w-5 h-5 opacity-70 group-hover:opacity-100" })] }), _jsxs(Button, { onClick: () => updateStatus(ApplicationStatus.REJECTED), variant: "danger", className: "w-full justify-between group py-3", children: ["Reject Application ", _jsx(XCircle, { className: "w-5 h-5 opacity-70 group-hover:opacity-100" })] })] })] }) }) })] })] }));
};
export default ApplicationReview;
