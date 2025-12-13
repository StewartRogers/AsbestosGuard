

import React from 'react';
import { EmployerFactSheet } from '../../types';
import { Button, Badge } from '../../components/UI';
import { Plus, Building2 } from 'lucide-react';

interface FactSheetListProps {
  factSheets: EmployerFactSheet[];
  onNewClick: () => void;
  onBack: () => void;
  onDelete?: (id: string) => void; // Add optional delete handler
}

const FactSheetList: React.FC<FactSheetListProps> = ({ factSheets, onNewClick, onBack, onDelete }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employer Fact Sheets</h1>
          <p className="text-slate-600 mt-1">Manage test data for Risk Analysis correlation.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onBack}>Back to Dashboard</Button>
          <Button onClick={onNewClick}>
            <Plus className="h-4 w-4 mr-2" />
            New Fact Sheet
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        {factSheets.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Fact Sheets found</h3>
            <p className="text-slate-500 mb-6">Add a new employer record to get started.</p>
            <Button onClick={onNewClick}>Add Record</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employer ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Legal Name / Trade Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Classification Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {factSheets.map((sheet) => (
                        <tr key={sheet.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                {sheet.employerId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{sheet.employerLegalName}</div>
                                <div className="text-xs text-slate-500">{sheet.employerTradeName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                <Badge color={sheet.activeStatus === 'Active' ? 'green' : 'gray'}>{sheet.activeStatus}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                {sheet.classificationUnit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className={sheet.overdueBalance > 0 ? "text-red-600 font-medium" : "text-slate-700"}>
                                    ${sheet.currentAccountBalance.toFixed(2)}
                                </div>
                                {sheet.overdueBalance > 0 && (
                                    <div className="text-xs text-red-500">
                                        Overdue: ${sheet.overdueBalance.toFixed(2)}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button 
                                variant="outline" 
                                className="text-xs px-2 py-1 h-auto mr-2"
                                onClick={() => alert(`Viewing details for ${sheet.employerLegalName}`)}
                                >
                                View
                                </Button>
                                {onDelete && (
                                    <Button 
                                        variant="danger" 
                                        className="text-xs px-2 py-1 h-auto"
                                        onClick={() => {
                                            if (window.confirm(`Delete Fact Sheet for ${sheet.employerLegalName}?`)) {
                                                onDelete(sheet.id);
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FactSheetList;