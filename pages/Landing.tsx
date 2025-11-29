import React from 'react';
import { ViewState } from '../types';
import { Building2, FileCheck } from 'lucide-react';
import { Card } from '../components/UI';

interface LandingProps {
  onNavigate: (view: ViewState) => void;
}

const LandingPage: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Apply for and Manage <span className="text-brand-600">Asbestos Licenses</span>
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-slate-500">
          Secure, efficient, and transparent licensing for asbestos removal professionals.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-brand-500" onClick={() => onNavigate('EMPLOYER_DASHBOARD')}>
          <div className="flex flex-col items-center text-center p-6">
            <div className="bg-brand-50 p-4 rounded-full mb-6">
              <Building2 className="h-10 w-10 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Employer / Contractor</h2>
            <p className="text-slate-600 mb-6">
              Submit new license applications, renew existing ones, and track status updates.
            </p>
            <button className="text-brand-600 font-medium hover:text-brand-800 flex items-center">
              Access Employer Portal &rarr;
            </button>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-slate-700" onClick={() => onNavigate('ADMIN_DASHBOARD')}>
          <div className="flex flex-col items-center text-center p-6">
            <div className="bg-slate-100 p-4 rounded-full mb-6">
              <FileCheck className="h-10 w-10 text-slate-700" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Administrator</h2>
            <p className="text-slate-600 mb-6">
              Review incoming applications, request information, and issue licenses securely.
            </p>
            <button className="text-slate-700 font-medium hover:text-slate-900 flex items-center">
              Access Admin Portal &rarr;
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LandingPage;
