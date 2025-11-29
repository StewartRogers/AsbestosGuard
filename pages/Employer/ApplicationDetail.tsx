import React from 'react';
import { LicenseApplication } from '../../types';
import { ApplicationSummary } from '../../components/ApplicationSummary';
import { Badge } from '../../components/UI';
import { ArrowLeft, Calendar, User } from 'lucide-react';

interface ApplicationDetailProps {
  application: LicenseApplication;
  onBack: () => void;
}

const ApplicationDetail: React.FC<ApplicationDetailProps> = ({ application, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div>
             <div className="text-sm text-slate-500 mb-1">Reference Number: {application.id}</div>
             <h1 className="text-2xl font-bold text-slate-900">{application.companyName}</h1>
          </div>
          <Badge color={
            application.status === 'Approved' ? 'green' :
            application.status === 'Rejected' ? 'red' :
            application.status === 'Needs Information' ? 'yellow' : 'blue'
          }>{application.status}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
           <div className="flex items-center">
             <User className="w-4 h-4 text-slate-400 mr-2" />
             <span className="text-slate-600 mr-2">Applicant:</span>
             <span className="font-medium text-slate-900">{application.applicantName}</span>
           </div>
           <div className="flex items-center">
             <Calendar className="w-4 h-4 text-slate-400 mr-2" />
             <span className="text-slate-600 mr-2">Submitted:</span>
             <span className="font-medium text-slate-900">{application.submissionDate}</span>
           </div>
        </div>
      </div>

      {application.wizardData ? (
        <ApplicationSummary data={application.wizardData} />
      ) : (
        <div className="bg-slate-50 p-8 rounded-lg text-center text-slate-500 border border-slate-200">
           <p>Detailed application data is not available for this legacy record.</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetail;