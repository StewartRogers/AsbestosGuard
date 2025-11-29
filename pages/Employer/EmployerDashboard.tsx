
import React from 'react';
import { LicenseApplication, ApplicationStatus } from '../../types';
import { Card, Button, Badge } from '../../components/UI';
import { Plus, Clock, FileText, CheckCircle, XCircle, AlertCircle, Search, User } from 'lucide-react';

interface EmployerDashboardProps {
  applications: LicenseApplication[];
  onNewClick: () => void;
  onLogout: () => void;
  onViewClick: (app: LicenseApplication) => void;
}

const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  switch (status) {
    case ApplicationStatus.APPROVED: return <Badge color="green">Approved</Badge>;
    case ApplicationStatus.REJECTED: return <Badge color="red">Rejected</Badge>;
    case ApplicationStatus.UNDER_REVIEW: return <Badge color="blue">Under Review</Badge>;
    case ApplicationStatus.SUBMITTED: return <Badge color="blue">Submitted</Badge>;
    case ApplicationStatus.NEEDS_INFO: return <Badge color="yellow">Action Required</Badge>;
    default: return <Badge color="gray">Draft</Badge>;
  }
};

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ applications, onNewClick, onLogout, onViewClick }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-600 mt-1">Manage your license requests and renewals.</p>
        </div>
        <div className="flex space-x-4">
            <Button variant="outline" onClick={onLogout}>Sign Out</Button>
            <Button onClick={onNewClick}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No applications found</h3>
            <p className="text-slate-500 mb-6">Get started by creating your first asbestos license application.</p>
            <Button onClick={onNewClick}>Start Application</Button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Edited By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-brand-600">{app.id}</div>
                            <div className="text-xs text-slate-500">{app.companyName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {app.lastUpdated || app.submissionDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            <div className="flex items-center">
                                <User className="w-4 h-4 mr-2 text-slate-400" />
                                {app.lastEditedBy || app.applicantName}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={app.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button 
                              variant="outline" 
                              className="text-xs px-2 py-1 h-auto"
                              onClick={() => onViewClick(app)}
                            >
                              View
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EmployerDashboard;
