import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { ApplicationStatus, LicenseType } from '../../types';
import { Button, Input, Select, Card } from '../../components/UI';
import { ApplicationSummary } from '../../components/ApplicationSummary';
import { analyzeApplicationServer } from '../../services/geminiClient';
import { ArrowLeft, ChevronRight, ChevronLeft, Check, AlertCircle, HelpCircle, Phone, Mail, UserPlus, Trash2, Calendar, Hash, Info } from 'lucide-react';
const STEPS = [
    { id: 1, title: 'Contact Info' },
    { id: 2, title: 'Scope of Work' },
    { id: 3, title: 'Firm Info' },
    { id: 4, title: 'Licensing History' },
    { id: 5, title: 'Associates' },
    { id: 6, title: 'Acknowledgement' },
    { id: 7, title: 'Review' },
];
// Initial State
const INITIAL_DATA = {
    contactFirstName: 'John', // Mock pre-fill from profile
    contactLastName: 'Doe',
    contactPhone: '5550192834',
    contactEmail: 'john.doe@example.com',
    contactRelationship: 'Owner',
    isAdultAndAuthorized: false,
    permissionToEmail: false,
    scopePerformsAbatement: false,
    scopeServiceBuildings: false,
    scopeServiceOthers: false,
    scopeTransport: false,
    scopeSurveys: false,
    firmLegalName: 'ASBESTOS TEST ACCOUNT FOR PREVENTION',
    firmAddress: '4161 SHEILA STREET, SUITE 305 RICHMOND, BC, V7C5J6',
    firmAccountNumber: '29615302',
    firmClassificationUnit: '2418 Service clean asbestos worksite (240202)',
    firmTradeName: '',
    firmWorkersCount: 0,
    firmNopDate: '',
    firmNopNumber: '',
    firmCertLevel1to4: 0,
    firmCertLevel3: 0,
    ackNonTransferable: false,
    historyRefused7Years: false,
    historyRefusedAuth: false,
    historyNonCompliance: false,
    historySuspended: false,
    associates: [],
    ackOutstandingAmounts: false,
    ackCompliance: false,
    ackEnforcement: false,
    reqWorkersCert: false,
    reqCompliance: false,
    reqRecords: false,
    reqCooperation: false,
};
const FormFooter = () => (_jsx("div", { className: "mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500", children: _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-slate-700 mb-1", children: "Have a question about your application?" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Mail, { className: "w-4 h-4" }), _jsx("a", { href: "mailto:licensing@worksafebc.com", className: "hover:text-brand-600 hover:underline", children: "licensing@worksafebc.com" })] })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-slate-700 mb-1", children: "Technical issues with completing your application?" }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Phone, { className: "w-4 h-4" }), _jsx("span", { children: "Phone toll free at 1.888.855.2477" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Mail, { className: "w-4 h-4" }), _jsx("a", { href: "mailto:ehelp@worksafebc.com", className: "hover:text-brand-600 hover:underline", children: "ehelp@worksafebc.com" })] })] })] })] }) }));
const RadioGroup = ({ label, name, checked, onChange, required = false }) => (_jsxs("div", { className: "bg-slate-50 p-4 rounded-lg border border-slate-200", children: [_jsxs("p", { className: "text-sm font-medium text-slate-900 mb-3", children: [label, " ", required && _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "flex space-x-6", children: [_jsxs("label", { className: "flex items-center cursor-pointer", children: [_jsx("input", { type: "radio", name: name, checked: checked === true, onChange: () => onChange(true), className: "h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-500" }), _jsx("span", { className: "ml-2 text-sm text-slate-700", children: "Yes" })] }), _jsxs("label", { className: "flex items-center cursor-pointer", children: [_jsx("input", { type: "radio", name: name, checked: checked === false, onChange: () => onChange(false), className: "h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-500" }), _jsx("span", { className: "ml-2 text-sm text-slate-700", children: "No" })] })] })] }));
const NewApplicationForm = ({ onSubmit, onCancel, factSheets }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState(INITIAL_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    // Scroll to top on step change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentStep]);
    const updateData = (updates) => {
        setData(prev => ({ ...prev, ...updates }));
        setError(null);
    };
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone) => /^\d{10}$/.test(phone.replace(/\D/g, ''));
    const validateStep = (step) => {
        setError(null);
        switch (step) {
            case 1: // Contact
                if (!data.contactFirstName || !data.contactLastName) {
                    setError("First and Last Name are required.");
                    return false;
                }
                if (!validatePhone(data.contactPhone)) {
                    setError("Please enter a valid 10-digit phone number.");
                    return false;
                }
                if (!validateEmail(data.contactEmail)) {
                    setError("Please enter a valid email address.");
                    return false;
                }
                if (!data.isAdultAndAuthorized) {
                    setError("You must certify that you are 18+ and authorized to represent the firm.");
                    return false;
                }
                if (!data.permissionToEmail) {
                    setError("You must grant permission for WorkSafeBC to email you.");
                    return false;
                }
                return true;
            case 3: // Firm
                if (!data.firmLegalName) {
                    setError("Legal name is required.");
                    return false;
                }
                if (!data.firmAccountNumber) {
                    setError("Account number is required.");
                    return false;
                }
                if (!data.firmAddress) {
                    setError("Mailing address is required.");
                    return false;
                }
                if (data.firmWorkersCount < 0) {
                    setError("Worker counts cannot be negative.");
                    return false;
                }
                if (!data.ackNonTransferable) {
                    setError("You must acknowledge the license transferability restriction to proceed.");
                    return false;
                }
                return true;
            case 5: // Associates
                for (const [index, asc] of data.associates.entries()) {
                    if (!asc.relationship || asc.relationship === 'Please select') {
                        setError(`Please select a relationship for Associate #${index + 1}.`);
                        return false;
                    }
                    // Require either Business Name OR (First Name AND Last Name)
                    const hasPersonName = asc.firstName && asc.lastName;
                    const hasBusinessName = asc.businessName;
                    if (!hasPersonName && !hasBusinessName) {
                        setError(`Associate #${index + 1} must have either a person's name (First and Last) or a Firm Name.`);
                        return false;
                    }
                    if (!asc.email || !validateEmail(asc.email)) {
                        setError(`Please enter a valid email for Associate #${index + 1}.`);
                        return false;
                    }
                    if (!asc.phone || !validatePhone(asc.phone)) {
                        setError(`Please enter a valid 10-digit phone number for Associate #${index + 1}.`);
                        return false;
                    }
                }
                return true;
            case 6: // Acknowledgement
                // Check if all associates have history filled out
                for (const asc of data.associates) {
                    if (!asc.history) {
                        setError(`Please complete the declaration for associate: ${asc.businessName || (asc.firstName + ' ' + asc.lastName)}`);
                        return false;
                    }
                }
                // Check Acknowledgments
                if (!data.ackOutstandingAmounts || !data.ackCompliance || !data.ackEnforcement) {
                    setError("You must acknowledge all items in the 'Final Acknowledgments' section.");
                    return false;
                }
                // Check License Requirements
                if (!data.reqWorkersCert || !data.reqCompliance || !data.reqRecords || !data.reqCooperation) {
                    setError("You must agree to all items in the 'License Requirements' section.");
                    return false;
                }
                return true;
            case 7: // Final Review
                return true;
            default: return true;
        }
    };
    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
        }
    };
    const handlePrev = () => {
        setError(null);
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };
    const handleSubmit = async () => {
        if (!validateStep(7))
            return;
        setIsSubmitting(true);
        const submissionDate = new Date().toISOString().split('T')[0];
        const applicantFullName = `${data.contactFirstName} ${data.contactLastName}`;
        // Construct the application object
        const newApp = {
            id: `APP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            companyName: data.firmLegalName, // Use edited firm name
            applicantName: applicantFullName,
            email: data.contactEmail,
            phone: data.contactPhone,
            address: data.firmAddress, // Use edited address
            licenseType: LicenseType.CLASS_A, // Derived from data or defaulted
            status: ApplicationStatus.SUBMITTED,
            submissionDate: submissionDate,
            lastUpdated: submissionDate,
            lastEditedBy: applicantFullName,
            safetyHistory: {
                hasViolations: data.historyNonCompliance || data.historyRefused7Years,
                yearsExperience: 5, // Derived
                insuranceExpiry: '2025-01-01',
                violationDetails: data.historyNonCompliance ? "See detailed history." : undefined
            },
            documents: [],
            wizardData: data
        };
        try {
            // Attempt to find matching Fact Sheet for Analysis Context (by Account Number only)
            const matchedFactSheet = factSheets.find(fs => fs.employerId === data.firmAccountNumber);
            // Debug logs removed for production; use a logger if needed
            // Run AI Analysis before submitting
            try {
                const analysis = await analyzeApplicationServer(newApp, matchedFactSheet);
                newApp.aiAnalysis = JSON.stringify(analysis);
            }
            catch (e) {
                console.error("AI Analysis failed on submit", e);
                newApp.aiAnalysis = JSON.stringify({ error: "AI analysis failed." }); // Fallback behavior
            }
        }
        catch (e) {
            console.error("AI Analysis failed on submit", e);
        }
        // Submit to parent component (App) which handles API persistence
        onSubmit(newApp);
        setIsSubmitting(false);
    };
    // --- Render Steps ---
    const renderStep1 = () => (_jsxs("div", { className: "space-y-6 animate-fadeIn", children: [_jsxs("div", { className: "bg-blue-50 p-4 rounded-md flex items-start", children: [_jsx(HelpCircle, { className: "w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" }), _jsx("p", { className: "text-sm text-blue-800", children: "We have pre-filled some information from your online services profile. Please verify it is correct." })] }), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "First Name", value: data.contactFirstName, onChange: (e) => updateData({ contactFirstName: e.target.value }) }), _jsx(Input, { label: "Last Name", value: data.contactLastName, onChange: (e) => updateData({ contactLastName: e.target.value }) }), _jsx(Input, { label: "Phone Number", value: data.contactPhone, placeholder: "10 digits only", onChange: (e) => updateData({ contactPhone: e.target.value }) }), _jsx(Input, { label: "Email Address", type: "email", value: data.contactEmail, onChange: (e) => updateData({ contactEmail: e.target.value }) })] }), _jsx(Select, { label: "Relationship to Firm", value: data.contactRelationship, onChange: (e) => updateData({ contactRelationship: e.target.value }), options: [
                    { value: 'Owner', label: 'Owner' },
                    { value: 'Director', label: 'Director' },
                    { value: 'Officer', label: 'Officer' },
                    { value: 'Proprietor', label: 'Proprietor' },
                    { value: 'Shareholder', label: 'Shareholder' },
                ] }), _jsxs("div", { className: "space-y-4 pt-4 border-t border-slate-200", children: [_jsx("h3", { className: "font-semibold text-slate-900", children: "Authorization" }), _jsxs("label", { className: "flex items-start p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100", children: [_jsx("input", { type: "checkbox", checked: data.isAdultAndAuthorized, onChange: (e) => updateData({ isAdultAndAuthorized: e.target.checked }), className: "mt-1 h-4 w-4 text-brand-600 rounded focus:ring-brand-500" }), _jsx("span", { className: "ml-3 text-sm text-slate-700", children: "I certify that I am 18 years of age or older and authorized to represent the firm in this application." })] }), _jsxs("label", { className: "flex items-start p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100", children: [_jsx("input", { type: "checkbox", checked: data.permissionToEmail, onChange: (e) => updateData({ permissionToEmail: e.target.checked }), className: "mt-1 h-4 w-4 text-brand-600 rounded focus:ring-brand-500" }), _jsx("span", { className: "ml-3 text-sm text-slate-700", children: "I grant permission for WorkSafeBC to send emails containing personal information regarding this application." })] })] })] }));
    const renderStep2 = () => (_jsxs("div", { className: "space-y-6 animate-fadeIn", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-slate-900", children: "Scope of Asbestos Abatement Work" }), _jsxs("p", { className: "text-sm text-slate-500 mt-1", children: ["Please answer yes or no to the following regarding your business activities.", _jsx("a", { href: "#", className: "ml-1 text-brand-600 underline", children: "View resources" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx(RadioGroup, { label: "Does your firm perform asbestos abatement work as defined by the Act?", name: "scopeAbatement", checked: data.scopePerformsAbatement, onChange: (val) => updateData({ scopePerformsAbatement: val }) }), _jsx(RadioGroup, { label: "Does your firm provide asbestos abatement services in relation to buildings?", name: "scopeBuildings", checked: data.scopeServiceBuildings, onChange: (val) => updateData({ scopeServiceBuildings: val }) }), _jsx(RadioGroup, { label: "Does your firm offer asbestos abatement services to others outside of your firm (i.e., to customers)?", name: "scopeOthers", checked: data.scopeServiceOthers, onChange: (val) => updateData({ scopeServiceOthers: val }) }), _jsx(RadioGroup, { label: "Does your firm transport asbestos-containing materials?", name: "scopeTransport", checked: data.scopeTransport, onChange: (val) => updateData({ scopeTransport: val }) }), _jsx(RadioGroup, { label: "Does your firm perform building surveys for the purposes of asbestos abatement?", name: "scopeSurveys", checked: data.scopeSurveys, onChange: (val) => updateData({ scopeSurveys: val }) })] })] }));
    const renderStep3 = () => (_jsxs("div", { className: "space-y-6 animate-fadeIn", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-slate-900", children: "Section: Firm information" }), _jsx("p", { className: "text-sm text-slate-600 mt-2", children: "Specific profile details for your firm\u2019s account information. Please ensure these details are correct." })] }), _jsx("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-5", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Account number", value: data.firmAccountNumber, onChange: (e) => updateData({ firmAccountNumber: e.target.value }) }), _jsx(Input, { label: "Legal name", value: data.firmLegalName, onChange: (e) => updateData({ firmLegalName: e.target.value }) }), _jsx(Input, { label: "Trade name (optional)", value: data.firmTradeName, onChange: (e) => updateData({ firmTradeName: e.target.value }), placeholder: "(empty)" }), _jsx(Input, { label: "Classification unit", value: data.firmClassificationUnit, onChange: (e) => updateData({ firmClassificationUnit: e.target.value }) }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Mailing address" }), _jsx("textarea", { className: "w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500", rows: 2, value: data.firmAddress, onChange: (e) => updateData({ firmAddress: e.target.value }) })] })] }) }), _jsx("div", { className: "bg-blue-50 border border-blue-100 rounded p-4", children: _jsxs("label", { className: "flex items-start cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.ackNonTransferable, onChange: (e) => updateData({ ackNonTransferable: e.target.checked }), className: "mt-1 h-4 w-4 text-brand-600 rounded focus:ring-brand-500 flex-shrink-0" }), _jsx("span", { className: "ml-3 text-sm text-blue-900 font-medium leading-relaxed", children: "I understand licenses are non-transferable and a separate application is required for each firm (i.e. for each WorkSafeBC account)." })] }) }), _jsxs("div", { className: "grid grid-cols-1 gap-6 pt-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "What is the date or number of the most recent Notice of Project (NOP)?" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-4 items-start sm:items-center", children: [_jsx("div", { className: "w-full sm:w-1/2", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(Calendar, { className: "h-5 w-5 text-slate-400" }) }), _jsx("input", { type: "date", className: "pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500", value: data.firmNopDate, onChange: (e) => updateData({ firmNopDate: e.target.value, firmNopNumber: '' }) })] }) }), _jsx("span", { className: "text-sm font-bold text-slate-500", children: "OR" }), _jsx("div", { className: "w-full sm:w-1/2", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(Hash, { className: "h-5 w-5 text-slate-400" }) }), _jsx("input", { type: "text", placeholder: "NOP Number (e.g. NOP-12345)", className: "pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500", value: data.firmNopNumber, onChange: (e) => updateData({ firmNopNumber: e.target.value, firmNopDate: '' }) })] }) })] }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Leave blank if not applicable." })] }), _jsx(Input, { label: "How many workers are currently employed at your firm?", type: "number", min: "0", value: data.firmWorkersCount, onChange: (e) => updateData({ firmWorkersCount: parseInt(e.target.value) || 0 }) }), _jsx(Input, { label: "How many workers have a valid WorkSafeBC asbestos certificate (Level 1, 2, 3, or 4)?", type: "number", min: "0", value: data.firmCertLevel1to4, onChange: (e) => updateData({ firmCertLevel1to4: parseInt(e.target.value) || 0 }) }), _jsx(Input, { label: "How many workers have a valid WorkSafeBC Level 3 asbestos certificate?", type: "number", min: "0", value: data.firmCertLevel3, onChange: (e) => updateData({ firmCertLevel3: parseInt(e.target.value) || 0 }) })] })] }));
    const renderStep4 = () => (_jsxs("div", { className: "space-y-6 animate-fadeIn", children: [_jsxs("div", { className: "bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6", children: [_jsxs("h4", { className: "text-amber-800 font-medium flex items-center mb-2", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), " Important Information"] }), _jsxs("div", { className: "text-sm text-amber-800 space-y-3", children: [_jsx("p", { children: "We may refuse to issue a licence if the applicant, or firm or person associated with the applicant has:" }), _jsxs("ul", { className: "list-disc pl-5 space-y-1", children: [_jsx("li", { children: "Been refused a licence within the last seven years in relation to asbestos abatement" }), _jsx("li", { children: "Been refused a licence or similar authorization in relation to asbestos abatement in B.C. or another jurisdiction (i.e., another province or country)" }), _jsx("li", { children: "Held a licence or similar authorization in relation to asbestos abatement in B.C. or another jurisdiction that has been suspended or cancelled" })] }), _jsx("p", { className: "font-medium mt-2", children: "Examples of similar authorizations include:" }), _jsxs("ul", { className: "list-disc pl-5 space-y-1", children: [_jsx("li", { children: "Hazardous Materials Abatement Licence \u2013 Alberta" }), _jsx("li", { children: "Nova Scotia Asbestos Abatement Contractor\u2019s Certificate" }), _jsx("li", { children: "Newfoundland and Labrador Asbestos Abatement Contractor Certificate" })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx(RadioGroup, { label: "Does your firm currently hold a licence in relation to asbestos abatement activities in B.C. or another jurisdiction, or has it held one in the last seven years?", name: "histRefused", checked: data.historyRefused7Years, onChange: (val) => updateData({ historyRefused7Years: val }) }), _jsx(RadioGroup, { label: "Have you or your firm been refused a licence or similar authorization in relation to asbestos abatement in B.C. or another jurisdiction at any point in the last seven years?", name: "histAuth", checked: data.historyRefusedAuth, onChange: (val) => updateData({ historyRefusedAuth: val }) }), _jsx(RadioGroup, { label: "Has your firm failed to comply with a term or condition of a licence in relation to asbestos abatement in B.C. or another jurisdiction at any point in the last seven years?", name: "histComply", checked: data.historyNonCompliance, onChange: (val) => updateData({ historyNonCompliance: val }) }), _jsx(RadioGroup, { label: "Has your firm had a licence or a similar authorization suspended or cancelled in relation to asbestos abatement in B.C. or another jurisdiction at any point in the last seven years?", name: "histSuspended", checked: data.historySuspended, onChange: (val) => updateData({ historySuspended: val }) })] })] }));
    const renderStep5 = () => {
        const addAssociate = () => {
            const newAssoc = {
                id: Math.random().toString(36).substr(2, 9),
                firstName: '', lastName: '', email: '', phone: '', relationship: 'Please select'
            };
            updateData({ associates: [...data.associates, newAssoc] });
        };
        const removeAssociate = (id) => {
            updateData({ associates: data.associates.filter(a => a.id !== id) });
        };
        const updateAssociate = (id, field, value) => {
            updateData({
                associates: data.associates.map(a => a.id === id ? { ...a, [field]: value } : a)
            });
        };
        return (_jsxs("div", { className: "space-y-6 animate-fadeIn", children: [_jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm text-slate-700 space-y-3 leading-relaxed", children: [_jsx("h3", { className: "text-lg font-bold text-slate-900", children: "Associated firms or persons" }), _jsx("p", { children: "Associated firms or persons refers to those in a business relationship between the firm and/or persons at the time of application. The legal definition of \u201Cperson\u201D includes an individual and an individual\u2019s heirs. The licensing process for firms and licensing requirements are intended to ensure that when firms or individuals work on asbestos projects, those conducting the work comply with rules (including the duty to ensure owners, directors, and officers who control the work comply)." }), _jsx("p", { className: "font-semibold", children: "Some examples of associated firms or persons include the following:" }), _jsxs("ul", { className: "list-disc pl-5 space-y-1", children: [_jsx("li", { children: "Pat is registered as an applicant for an asbestos licence. Pat is also the director of ABC Excavation Inc. In this case, both Pat and ABC Excavation are associated with the applicant." }), _jsx("li", { children: "Sam is a director of Parent Corporation, which also manages two firms. Sam is also a director of Sub Corporation. Sam, Parent Corporation, and Sub Corporation are associated with the applicant." }), _jsx("li", { children: "Chris is a shareholder of Firm A. Chris is also a director of Firm B. Both firms are associated with the applicant." }), _jsx("li", { children: "Lee is an officer of Firm A. Lee is also an officer of Firm B. Both firms are associated with the applicant." }), _jsx("li", { children: "Kim is associated with Firm A through a spouse, who is an officer, director, or shareholder of Firm A. Both Kim and Firm A are associated with the applicant." })] }), _jsx("p", { children: "The licensing process considers these relationships to ensure compliance." }), _jsx("p", { className: "font-medium", children: "List and provide contact information for any persons, directors, officers, proprietors, shareholders, and firms or persons associated with the applicant." })] }), data.associates.map((assoc, index) => (_jsxs(Card, { className: "relative border-slate-300 shadow-sm", children: [_jsx("button", { onClick: () => removeAssociate(assoc.id), className: "absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1", title: "Remove Associate", children: _jsx(Trash2, { className: "w-5 h-5" }) }), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "md:col-span-2 text-sm font-bold text-brand-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-2", children: ["Associate #", index + 1] }), _jsx("div", { className: "md:col-span-2", children: _jsx(Select, { label: "Individual Relationship", value: assoc.relationship, onChange: (e) => updateAssociate(assoc.id, 'relationship', e.target.value), options: [
                                            { value: 'Please select', label: 'Please select' },
                                            { value: 'Owner', label: 'Owner' },
                                            { value: 'Director', label: 'Director' },
                                            { value: 'Officer', label: 'Officer' },
                                            { value: 'Shareholder', label: 'Shareholder' },
                                        ] }) }), _jsx("div", { className: "md:col-span-2", children: _jsx("h5", { className: "text-xs font-bold text-slate-500 uppercase mb-2", children: "Identity (Person OR Firm)" }) }), _jsx(Input, { label: "First Name", value: assoc.firstName, onChange: (e) => updateAssociate(assoc.id, 'firstName', e.target.value) }), _jsx(Input, { label: "Last Name", value: assoc.lastName, onChange: (e) => updateAssociate(assoc.id, 'lastName', e.target.value) }), _jsx("div", { className: "md:col-span-2", children: _jsx(Input, { label: "Business Name (if applicable)", value: assoc.businessName || '', onChange: (e) => updateAssociate(assoc.id, 'businessName', e.target.value), placeholder: "e.g. ABC Excavation Inc." }) }), _jsx("div", { className: "md:col-span-2 mt-2", children: _jsx("h5", { className: "text-xs font-bold text-slate-500 uppercase mb-2", children: "Contact Information" }) }), _jsx(Input, { label: "Email Address", value: assoc.email, onChange: (e) => updateAssociate(assoc.id, 'email', e.target.value) }), _jsx(Input, { label: "Phone Number", value: assoc.phone, onChange: (e) => updateAssociate(assoc.id, 'phone', e.target.value) })] })] }, assoc.id))), _jsxs(Button, { onClick: addAssociate, variant: "outline", className: "w-full border-dashed border-2 py-4 text-slate-600 hover:text-brand-600 hover:border-brand-300", children: [_jsx(UserPlus, { className: "w-5 h-5 mr-2" }), " Add Associated Person or Firm"] }), _jsxs("div", { className: "mt-6 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded text-sm text-slate-600", children: [_jsxs("h5", { className: "font-bold text-slate-800 mb-2 flex items-center", children: [_jsx(Info, { className: "w-4 h-4 mr-2" }), " Help with associations:"] }), _jsxs("ul", { className: "space-y-1 list-disc pl-5", children: [_jsx("li", { children: "Person associated with the applicant" }), _jsx("li", { children: "Firm associated with the applicant" }), _jsx("li", { children: "Person associated through marriage/common-law" })] }), _jsxs("p", { className: "mt-3 font-medium", children: ["Questions? Call 1.888.621.3677 or email ", _jsx("a", { href: "mailto:ehsl@worksafebc.com", className: "text-brand-600 underline", children: "ehsl@worksafebc.com" })] })] })] }));
    };
    const renderStep6 = () => {
        const updateHistory = (assocId, field, value) => {
            const newAssociates = data.associates.map(a => {
                if (a.id !== assocId)
                    return a;
                const currentHistory = a.history || {
                    cancelledOrRefused: false,
                    enforcementAction: false,
                    criminalCivilProcess: false,
                    asbestosEnforcement: false
                };
                return {
                    ...a,
                    history: { ...currentHistory, [field]: value }
                };
            });
            updateData({ associates: newAssociates });
        };
        return (_jsxs("div", { className: "space-y-8 animate-fadeIn", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-slate-900", children: "Acknowledgement & Declarations" }), _jsx("p", { className: "text-sm text-slate-500 mt-1", children: "Please complete the following declarations and acknowledgments." })] }), data.associates.length > 0 && (_jsxs("div", { className: "space-y-6", children: [_jsx("h4", { className: "font-bold text-slate-800 border-b border-slate-200 pb-2", children: "Declarations for Associated Entities" }), data.associates.map((assoc, index) => {
                            const displayName = assoc.businessName || `${assoc.firstName} ${assoc.lastName}`;
                            return (_jsxs("div", { className: "bg-white p-6 rounded-lg border border-slate-200 shadow-sm", children: [_jsxs("h4", { className: "font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4", children: [index + 1, ". ", displayName, " ", _jsxs("span", { className: "text-slate-400 font-normal", children: ["(", assoc.relationship, ")"] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsx("span", { className: "text-sm text-slate-700 w-3/4", children: "Has this person/firm ever had a licence cancelled or refused?" }), _jsxs("div", { className: "flex space-x-4", children: [_jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.cancelledOrRefused === true, onChange: () => updateHistory(assoc.id, 'cancelledOrRefused', true), className: "mr-2" }), " Yes"] }), _jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.cancelledOrRefused === false, onChange: () => updateHistory(assoc.id, 'cancelledOrRefused', false), className: "mr-2" }), " No"] })] })] }), _jsxs("div", { className: "flex items-center justify-between py-2 bg-slate-50 rounded px-2", children: [_jsx("span", { className: "text-sm text-slate-700 w-3/4", children: "Has any enforcement action been taken against them?" }), _jsxs("div", { className: "flex space-x-4", children: [_jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.enforcementAction === true, onChange: () => updateHistory(assoc.id, 'enforcementAction', true), className: "mr-2" }), " Yes"] }), _jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.enforcementAction === false, onChange: () => updateHistory(assoc.id, 'enforcementAction', false), className: "mr-2" }), " No"] })] })] }), _jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsx("span", { className: "text-sm text-slate-700 w-3/4", children: "Are they involved in any criminal or civil process?" }), _jsxs("div", { className: "flex space-x-4", children: [_jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.criminalCivilProcess === true, onChange: () => updateHistory(assoc.id, 'criminalCivilProcess', true), className: "mr-2" }), " Yes"] }), _jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.criminalCivilProcess === false, onChange: () => updateHistory(assoc.id, 'criminalCivilProcess', false), className: "mr-2" }), " No"] })] })] }), _jsxs("div", { className: "flex items-center justify-between py-2 bg-slate-50 rounded px-2", children: [_jsx("span", { className: "text-sm text-slate-700 w-3/4", children: "Was the enforcement action related to asbestos work?" }), _jsxs("div", { className: "flex space-x-4", children: [_jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.asbestosEnforcement === true, onChange: () => updateHistory(assoc.id, 'asbestosEnforcement', true), className: "mr-2" }), " Yes"] }), _jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "radio", checked: assoc.history?.asbestosEnforcement === false, onChange: () => updateHistory(assoc.id, 'asbestosEnforcement', false), className: "mr-2" }), " No"] })] })] })] })] }, assoc.id));
                        })] })), _jsxs("section", { children: [_jsx("h4", { className: "font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4", children: "Final Acknowledgments" }), _jsxs("div", { className: "bg-white rounded-lg border border-slate-200 divide-y divide-slate-100", children: [_jsxs("label", { className: "flex items-start p-4 hover:bg-slate-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.ackOutstandingAmounts, onChange: (e) => updateData({ ackOutstandingAmounts: e.target.checked }), className: "mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500" }), _jsxs("div", { className: "ml-3", children: [_jsx("span", { className: "block text-sm font-medium text-slate-900", children: "Outstanding Amounts" }), _jsx("span", { className: "block text-sm text-slate-500", children: "I acknowledge that outstanding amounts owing to WorkSafeBC may affect the outcome of this application." })] })] }), _jsxs("label", { className: "flex items-start p-4 hover:bg-slate-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.ackCompliance, onChange: (e) => updateData({ ackCompliance: e.target.checked }), className: "mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500" }), _jsxs("div", { className: "ml-3", children: [_jsx("span", { className: "block text-sm font-medium text-slate-900", children: "Act & OHS Regulation" }), _jsx("span", { className: "block text-sm text-slate-500", children: "I certify that our firm is in compliance with the Act and OHS Regulation." })] })] }), _jsxs("label", { className: "flex items-start p-4 hover:bg-slate-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.ackEnforcement, onChange: (e) => updateData({ ackEnforcement: e.target.checked }), className: "mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500" }), _jsxs("div", { className: "ml-3", children: [_jsx("span", { className: "block text-sm font-medium text-slate-900", children: "Enforcement Activities" }), _jsx("span", { className: "block text-sm text-slate-500", children: "I understand that past enforcement activities (penalties, stop-work orders, injunctions, etc.) are considered during review." })] })] })] })] }), _jsxs("section", { children: [_jsx("h4", { className: "font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4", children: "License Requirements" }), _jsxs("div", { className: "bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4", children: [_jsxs("label", { className: "flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.reqWorkersCert, onChange: (e) => updateData({ reqWorkersCert: e.target.checked }), className: "h-4 w-4 text-brand-600 rounded focus:ring-brand-500" }), _jsx("span", { className: "ml-3 text-sm text-slate-700", children: "Workers must have valid WorkSafeBC asbestos certificate." })] }), _jsxs("label", { className: "flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.reqCompliance, onChange: (e) => updateData({ reqCompliance: e.target.checked }), className: "h-4 w-4 text-brand-600 rounded focus:ring-brand-500" }), _jsx("span", { className: "ml-3 text-sm text-slate-700", children: "Ongoing compliance with Act and OHS Regulation." })] }), _jsxs("label", { className: "flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.reqRecords, onChange: (e) => updateData({ reqRecords: e.target.checked }), className: "h-4 w-4 text-brand-600 rounded focus:ring-brand-500" }), _jsx("span", { className: "ml-3 text-sm text-slate-700", children: "Submission of records/documents as required by the Board." })] }), _jsxs("label", { className: "flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: data.reqCooperation, onChange: (e) => updateData({ reqCooperation: e.target.checked }), className: "h-4 w-4 text-brand-600 rounded focus:ring-brand-500" }), _jsx("span", { className: "ml-3 text-sm text-slate-700", children: "Full cooperation with inspectors." })] })] })] })] }));
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "mb-10", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("button", { onClick: onCancel, className: "flex items-center text-slate-500 hover:text-slate-900 transition-colors", children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-1" }), _jsx("span", { className: "hidden sm:inline", children: "Exit Application" }), _jsx("span", { className: "sm:hidden", children: "Exit" })] }), _jsx("h2", { className: "text-xl font-bold text-slate-900 text-center flex-grow mx-4", children: STEPS[currentStep - 1].title }), _jsxs("div", { className: "text-sm font-medium text-slate-500 whitespace-nowrap", children: ["Step ", currentStep, " / ", STEPS.length] })] }), _jsxs("div", { className: "relative mx-auto px-2", children: [_jsx("div", { className: "absolute top-4 left-2 right-2 h-0.5 bg-slate-200 -z-10 rounded" }), _jsx("div", { className: "absolute top-4 left-2 h-0.5 bg-brand-600 -z-10 rounded transition-all duration-500 ease-in-out", style: { width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 1rem + ${((currentStep - 1) / (STEPS.length - 1)) * 2}rem)` } }), _jsx("div", { className: "absolute top-4 left-4 h-0.5 bg-brand-600 -z-10 rounded transition-all duration-500 ease-in-out", style: { width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 2rem)` } }), _jsx("div", { className: "flex justify-between relative", children: STEPS.map((step, index) => {
                                    const stepNum = index + 1;
                                    const isCompleted = stepNum < currentStep;
                                    const isCurrent = stepNum === currentStep;
                                    return (_jsxs("div", { className: "flex flex-col items-center group cursor-default", children: [_jsx("div", { className: `
                                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 z-10
                                    ${isCompleted
                                                    ? 'bg-brand-600 border-brand-600 text-white'
                                                    : isCurrent
                                                        ? 'bg-white border-brand-600 text-brand-600 shadow-md scale-110'
                                                        : 'bg-slate-50 border-slate-300 text-slate-400'}
                                `, children: isCompleted ? _jsx(Check, { className: "w-5 h-5" }) : stepNum }), _jsx("div", { className: `
                                mt-2 text-[10px] sm:text-xs font-medium text-center max-w-[60px] sm:max-w-[80px] leading-tight transition-colors duration-300 hidden sm:block
                                ${isCurrent ? 'text-brand-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}
                            `, children: step.title })] }, step.id));
                                }) })] }), _jsxs("div", { className: "mt-8 mb-2 px-2", children: [_jsxs("div", { className: "flex justify-between text-xs font-medium text-slate-500 mb-1", children: [_jsx("span", { children: "Total Progress" }), _jsxs("span", { children: [Math.round(((currentStep - 1) / STEPS.length) * 100), "%"] })] }), _jsx("div", { className: "w-full bg-slate-200 rounded-full h-2", children: _jsx("div", { className: "bg-brand-600 h-2 rounded-full transition-all duration-500 ease-out", style: { width: `${Math.round(((currentStep - 1) / STEPS.length) * 100)}%` } }) })] })] }), _jsx(Card, { children: _jsxs("div", { className: "min-h-[400px] flex flex-col", children: [_jsxs("div", { className: "flex-grow p-1", children: [currentStep === 1 && renderStep1(), currentStep === 2 && renderStep2(), currentStep === 3 && renderStep3(), currentStep === 4 && renderStep4(), currentStep === 5 && renderStep5(), currentStep === 6 && renderStep6(), currentStep === 7 && (_jsx(ApplicationSummary, { data: data, onEditStep: (step) => setCurrentStep(step) })), error && (_jsxs("div", { className: "mt-6 p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200 flex items-start animate-pulse", children: [_jsx(AlertCircle, { className: "w-5 h-5 mr-2 shrink-0" }), _jsxs("div", { children: [_jsx("span", { className: "font-bold block mb-1", children: "Please correct the following:" }), error] })] }))] }), _jsxs("div", { className: "flex justify-between pt-8 mt-8 border-t border-slate-100", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: currentStep === 1 ? onCancel : handlePrev, disabled: isSubmitting, children: currentStep === 1 ? 'Exit' : (_jsxs(_Fragment, { children: [_jsx(ChevronLeft, { className: "w-4 h-4 mr-1" }), " Back"] })) }), currentStep < STEPS.length ? (_jsxs(Button, { type: "button", onClick: handleNext, children: ["Continue ", _jsx(ChevronRight, { className: "w-4 h-4 ml-1" })] })) : (_jsxs(Button, { onClick: handleSubmit, isLoading: isSubmitting, className: "bg-green-600 hover:bg-green-700 w-full sm:w-auto", children: ["Submit Application ", _jsx(Check, { className: "w-4 h-4 ml-2" })] }))] }), _jsx(FormFooter, {})] }) })] }));
};
export default NewApplicationForm;
