
import React, { useRef } from 'react';
import { LicenseApplication, ApplicationStatus, EmployerFactSheet } from '../../types';
import { Button, Badge } from '../../components/UI';
import { Search, Filter, Download, Upload, Database } from 'lucide-react';

interface AdminDashboardProps {
  applications: LicenseApplication[];
  factSheets: EmployerFactSheet[];
  onReviewClick: (id: string) => void;
  onLogout: () => void;
  onDataImport: (data: { applications: LicenseApplication[], factSheets: EmployerFactSheet[] }) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ applications, factSheets, onReviewClick, onLogout, onDataImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (json.applications && Array.isArray(json.applications)) {
             onDataImport(json);
          } else {
             alert("Invalid file format. JSON must contain an 'applications' array.");
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert("Failed to parse the file. Please ensure it is a valid JSON backup.");
        }
      };
      reader.readAsText(file);
    }
    // Reset input so same file can be selected again if needed
    if (event.target) event.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Review and manage asbestos license applications.</p>
        </div>
        <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json"
            />
            <Button variant="secondary" onClick={handleExport} title="Download Backup">
                <Download className="w-4 h-4 mr-2" />
                Export DB
            </Button>
            <Button variant="secondary" onClick={handleImportClick} title="Restore Backup">
                <Upload className="w-4 h-4 mr-2" />
                Import DB
            </Button>
            <div className="w-px bg-slate-300 mx-2"></div>
            <Button variant="outline" onClick={onLogout}>Sign Out</Button>
        </div>
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
