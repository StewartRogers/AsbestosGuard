import React from 'react';
import { EmployerFactSheet } from '../../types';
import { Button } from '../../components/UI';

interface FactSheetViewProps {
  factSheet: EmployerFactSheet;
  onBack: () => void;
}

const FactSheetView: React.FC<FactSheetViewProps> = ({ factSheet, onBack }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Fact Sheet Details</h1>
        <Button variant="outline" onClick={onBack}>Back to List</Button>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
        <h2 className="text-xl font-bold mb-4">{factSheet.employerLegalName}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="font-medium text-slate-500">Employer ID</dt><dd className="text-slate-900">{factSheet.employerId}</dd></div>
          <div><dt className="font-medium text-slate-500">Trade Name</dt><dd className="text-slate-900">{factSheet.employerTradeName}</dd></div>
          <div><dt className="font-medium text-slate-500">Classification Unit</dt><dd className="text-slate-900">{factSheet.classificationUnit}</dd></div>
          <div><dt className="font-medium text-slate-500">Status</dt><dd className="text-slate-900">{factSheet.activeStatus}</dd></div>
          <div><dt className="font-medium text-slate-500">Current Account Balance</dt><dd className="text-slate-900">${factSheet.currentAccountBalance.toFixed(2)}</dd></div>
          <div><dt className="font-medium text-slate-500">Overdue Balance</dt><dd className="text-slate-900">${factSheet.overdueBalance.toFixed(2)}</dd></div>
          <div><dt className="font-medium text-slate-500">Years of Experience</dt><dd className="text-slate-900">{factSheet.yearsOfExperience}</dd></div>
          <div><dt className="font-medium text-slate-500">Insurance Expiry</dt><dd className="text-slate-900">{factSheet.insuranceExpiry}</dd></div>
          <div><dt className="font-medium text-slate-500">Violations Record</dt><dd className="text-slate-900">{factSheet.violationsRecord}</dd></div>
        </dl>
      </div>
    </div>
  );
};

export default FactSheetView;