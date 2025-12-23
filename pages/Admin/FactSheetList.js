import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Button, Badge } from '../../components/UI';
import { Plus, Building2 } from 'lucide-react';
import { deleteFactSheet } from '../../services/apiService';
const FactSheetList = ({ factSheets, onNewClick, onBack, onView, onEdit, onDelete }) => {
    const handleDownloadSample = () => {
        const sampleFactSheet = [
            {
                employerId: "12345",
                employerLegalName: "Sample Legal Name",
                employerTradeName: "Sample Trade Name",
                classificationUnit: "Construction",
                activeStatus: "Active",
                currentAccountBalance: 1000.0,
                overdueBalance: 0.0,
                yearsOfExperience: "5 years",
                insuranceExpiry: "2026-12-31",
                violationsRecord: "None",
            },
        ];
        const blob = new Blob([JSON.stringify(sampleFactSheet, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "sample_fact_sheet.json";
        link.click();
        URL.revokeObjectURL(url);
    };
    // Update the onDelete handler to call parent when provided
    const handleDelete = async (id) => {
        try {
            if (onDelete) {
                await onDelete(id);
            }
            else {
                await deleteFactSheet(id);
            }
            alert('Fact sheet deleted successfully!');
        }
        catch (error) {
            console.error('Failed to delete fact sheet:', error);
            alert('Failed to delete fact sheet. Please try again.');
        }
    };
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-slate-900", children: "Employer Fact Sheets" }), _jsx("p", { className: "text-slate-600 mt-1", children: "Manage test data for Risk Analysis correlation." })] }), _jsxs("div", { className: "flex space-x-3", children: [_jsx(Button, { variant: "outline", onClick: onBack, children: "Back to Dashboard" }), _jsxs(Button, { onClick: onNewClick, children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "New Fact Sheet"] }), _jsx(Button, { onClick: handleDownloadSample, className: "ml-3", children: "Download Sample" })] })] }), _jsx("div", { className: "bg-white rounded-lg shadow border border-slate-200 overflow-hidden", children: factSheets.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(Building2, { className: "h-12 w-12 text-slate-300 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-slate-900", children: "No Fact Sheets found" }), _jsx("p", { className: "text-slate-500 mb-6", children: "Add a new employer record to get started." }), _jsx(Button, { onClick: onNewClick, children: "Add Record" })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200", children: [_jsx("thead", { className: "bg-slate-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Employer ID" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Legal Name / Trade Name" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Classification Unit" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Balance" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Action" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-slate-200", children: factSheets.map((sheet, index) => (_jsxs("tr", { className: "hover:bg-slate-50 transition-colors", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900", children: sheet.employerId }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("div", { className: "text-sm font-medium text-slate-900", children: sheet.employerLegalName }), _jsx("div", { className: "text-xs text-slate-500", children: sheet.employerTradeName })] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-slate-700", children: _jsx(Badge, { color: sheet.activeStatus === 'Active' ? 'green' : 'gray', children: sheet.activeStatus }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-slate-700", children: sheet.classificationUnit }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm", children: [_jsxs("div", { className: sheet.overdueBalance > 0 ? "text-red-600 font-medium" : "text-slate-700", children: ["$", sheet.currentAccountBalance.toFixed(2)] }), sheet.overdueBalance > 0 && (_jsxs("div", { className: "text-xs text-red-500", children: ["Overdue: $", sheet.overdueBalance.toFixed(2)] }))] }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: [_jsx(Button, { variant: "outline", className: "text-xs px-2 py-1 h-auto mr-2", onClick: () => onView ? onView(sheet) : alert(`Viewing details for ${sheet.employerLegalName}`), children: "View" }), _jsx(Button, { variant: "outline", className: "text-xs px-2 py-1 h-auto mr-2", onClick: () => onEdit ? onEdit(sheet) : alert(`Editing details for ${sheet.employerLegalName}`), children: "Edit" }), onDelete && (_jsx(Button, { variant: "danger", className: "text-xs px-2 py-1 h-auto", onClick: () => {
                                                        if (window.confirm(`Delete Fact Sheet for ${sheet.employerLegalName}?`)) {
                                                            handleDelete(sheet.id);
                                                        }
                                                    }, children: "Delete" }))] })] }, sheet.id || index))) })] }) })) })] }));
};
export default FactSheetList;
