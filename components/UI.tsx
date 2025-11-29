import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline', isLoading?: boolean }> = ({ 
  className = '', 
  variant = 'primary', 
  isLoading = false,
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-brand-500"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, error?: string }> = ({ label, error, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input 
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${error ? 'border-red-300' : 'border-slate-300'} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: {value: string, label: string}[] }> = ({ label, options, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <select 
      className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${className}`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { title?: string, action?: React.ReactNode }> = ({ children, className = '', title, action, ...props }) => (
  <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`} {...props}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode, color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-slate-100 text-slate-800'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};