import React from 'react';
import { LicenseApplication, ApplicationStatus } from '../../types';
import { Card, Button, Badge } from '../../components/UI';
import { Search, Filter, AlertTriangle } from 'lucide-react';

interface AdminDashboardProps {
  applications: LicenseApplication[];
  onReviewClick: (id: string) => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ applications, onReviewClick, onLogout }) => {
  const pendingApps = applications.filter(a => a.status === ApplicationStatus.SUBMITTED || a.status === ApplicationStatus.UNDER_REVIEW);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Review and manage asbestos license applications.</p>
        </div>
        <Button variant="outline" onClick={onLogout}>Sign Out</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input 
            type="text" 
            placeholder="Search applications..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
        <Button variant="secondary" className="sm:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Filter Status
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company / Applicant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">License Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Factors</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{app.companyName}</div>
                      <div className="text-sm text-slate-500">{app.applicantName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700">{app.licenseType.split('(')[0]}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {app.submissionDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {app.safetyHistory.hasViolations ? (
                    <Badge color="red">Violations</Badge>
                  ) : (
                     <span className="text-sm text-slate-500">Clean Record</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge color={
                    app.status === ApplicationStatus.APPROVED ? 'green' :
                    app.status === ApplicationStatus.REJECTED ? 'red' :
                    app.status === ApplicationStatus.NEEDS_INFO ? 'yellow' : 'blue'
                  }>{app.status}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => onReviewClick(app.id)}
                    className="text-brand-600 hover:text-brand-900"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {applications.length === 0 && (
             <div className="p-8 text-center text-slate-500">No applications found.</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
