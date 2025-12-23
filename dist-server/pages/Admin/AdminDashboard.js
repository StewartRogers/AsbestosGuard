import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef } from 'react';
import { ApplicationStatus } from '../../types';
import { Button, Badge } from '../../components/UI';
import { Search, Filter, Download, Upload } from 'lucide-react';
const AdminDashboard = ({ applications, factSheets, onReviewClick, onLogout, onDataImport }) => {
    const fileInputRef = useRef(null);
    const handleExport = () => {
        const dataStr = JSON.stringify({ applications, factSheets }, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        // Create timestamp YYYY-MM-DD_HH-mm-ss for unique filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        link.href = url;
        link.download = `asbestos_db_backup_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result);
                    if (json.applications && Array.isArray(json.applications)) {
                        onDataImport(json);
                    }
                    else {
                        alert("Invalid file format. JSON must contain an 'applications' array.");
                    }
                }
                catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Failed to parse the file. Please ensure it is a valid JSON backup.");
                }
            };
            reader.readAsText(file);
        }
        // Reset input so same file can be selected again if needed
        if (event.target)
            event.target.value = '';
    };
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-slate-900", children: "Admin Dashboard" }), _jsx("p", { className: "text-slate-600 mt-1", children: "Review and manage asbestos license applications." })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileChange, className: "hidden", accept: ".json" }), _jsxs(Button, { variant: "secondary", onClick: handleExport, title: "Download Backup", children: [_jsx(Download, { className: "w-4 h-4 mr-2" }), "Export DB"] }), _jsxs(Button, { variant: "secondary", onClick: handleImportClick, title: "Restore Backup", children: [_jsx(Upload, { className: "w-4 h-4 mr-2" }), "Import DB"] }), _jsx("div", { className: "w-px bg-slate-300 mx-2" }), _jsx(Button, { variant: "outline", onClick: onLogout, children: "Sign Out" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-4 mb-6", children: [_jsxs("div", { className: "relative flex-grow", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" }), _jsx("input", { type: "text", placeholder: "Search applications...", className: "w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:outline-none" })] }), _jsxs(Button, { variant: "secondary", className: "sm:w-auto", children: [_jsx(Filter, { className: "w-4 h-4 mr-2" }), "Filter Status"] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow border border-slate-200 overflow-hidden", children: [_jsxs("table", { className: "min-w-full divide-y divide-slate-200", children: [_jsx("thead", { className: "bg-slate-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Company / Applicant" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "License Type" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Date Submitted" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Risk Factors" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Action" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-slate-200", children: applications.map((app, idx) => (_jsxs("tr", { className: "hover:bg-slate-50 transition-colors", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "flex items-center", children: _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-slate-900", children: app.companyName }), _jsx("div", { className: "text-sm text-slate-500", children: app.applicantName })] }) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: "text-sm text-slate-700", children: app.licenseType?.split?.('(')[0] ?? 'Unknown' }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-slate-500", children: app.submissionDate }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: app.safetyHistory?.hasViolations ? (_jsx(Badge, { color: "red", children: "Violations" })) : (_jsx("span", { className: "text-sm text-slate-500", children: typeof app.safetyHistory?.hasViolations === 'boolean' ? 'Clean Record' : 'Unknown' })) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx(Badge, { color: app.status === ApplicationStatus.APPROVED ? 'green' :
                                                    app.status === ApplicationStatus.REJECTED ? 'red' :
                                                        app.status === ApplicationStatus.NEEDS_INFO ? 'yellow' : 'blue', children: app.status }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsx("button", { onClick: () => onReviewClick(app.id), className: "text-brand-600 hover:text-brand-900", children: "Review" }) })] }, app.id ?? `app-${idx}`))) })] }), applications.length === 0 && (_jsx("div", { className: "p-8 text-center text-slate-500", children: "No applications found." }))] })] }));
};
export default AdminDashboard;
