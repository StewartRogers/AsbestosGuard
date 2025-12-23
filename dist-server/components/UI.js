import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Loader2 } from 'lucide-react';
export const Button = ({ className = '', variant = 'primary', isLoading = false, children, ...props }) => {
    const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        outline: "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-brand-500"
    };
    return (_jsxs("button", { className: `${baseStyles} ${variants[variant]} ${className}`, disabled: isLoading || props.disabled, ...props, children: [isLoading && _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), children] }));
};
export const Input = ({ label, error, className = '', ...props }) => (_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: label }), _jsx("input", { className: `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${error ? 'border-red-300' : 'border-slate-300'} ${className}`, ...props }), error && _jsx("p", { className: "mt-1 text-sm text-red-600", children: error })] }));
export const Select = ({ label, options, className = '', ...props }) => (_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: label }), _jsx("select", { className: `w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${className}`, ...props, children: options.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] }));
export const Card = ({ children, className = '', title, action, ...props }) => (_jsxs("div", { className: `bg-white rounded-lg border border-slate-200 shadow-sm ${className}`, ...props, children: [(title || action) && (_jsxs("div", { className: "px-6 py-4 border-b border-slate-100 flex justify-between items-center", children: [title && _jsx("h3", { className: "text-lg font-semibold text-slate-900", children: title }), action && _jsx("div", { children: action })] })), _jsx("div", { className: "p-6", children: children })] }));
export const Badge = ({ children, color = 'gray' }) => {
    const colors = {
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-amber-100 text-amber-800',
        red: 'bg-red-100 text-red-800',
        blue: 'bg-blue-100 text-blue-800',
        gray: 'bg-slate-100 text-slate-800'
    };
    return (_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`, children: children }));
};
