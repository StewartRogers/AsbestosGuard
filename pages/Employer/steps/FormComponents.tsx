import React from 'react';
import { Phone, Mail } from 'lucide-react';

export const RadioGroup = ({
  label,
  name,
  checked,
  onChange,
  required = false,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  required?: boolean;
}) => (
  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
    <p className="text-sm font-medium text-slate-900 mb-3">
      {label} {required && <span className="text-red-500">*</span>}
    </p>
    <div className="flex space-x-6">
      <label className="flex items-center cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={checked === true}
          onChange={() => onChange(true)}
          className="h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-500"
        />
        <span className="ml-2 text-sm text-slate-700">Yes</span>
      </label>
      <label className="flex items-center cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={checked === false}
          onChange={() => onChange(false)}
          className="h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-500"
        />
        <span className="ml-2 text-sm text-slate-700">No</span>
      </label>
    </div>
  </div>
);

export const FormFooter = () => (
  <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500">
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold text-slate-700 mb-1">Have a question about your application?</h4>
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4" />
          <a href="mailto:licensing@worksafebc.com" className="hover:text-brand-600 hover:underline">
            licensing@worksafebc.com
          </a>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-slate-700 mb-1">Technical issues with completing your application?</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>Phone toll free at 1.888.855.2477</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <a href="mailto:ehelp@worksafebc.com" className="hover:text-brand-600 hover:underline">
              ehelp@worksafebc.com
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
);
