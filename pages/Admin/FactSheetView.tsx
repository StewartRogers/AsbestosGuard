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
        <p><strong>Employer ID:</strong> {factSheet.employerId}</p>
        <p><strong>Trade Name:</strong> {factSheet.employerTradeName}</p>
        <p><strong>Classification Unit:</strong> {factSheet.classificationUnit}</p>
        <p><strong>Status:</strong> {factSheet.activeStatus}</p>
        <p><strong>Current Account Balance:</strong> ${factSheet.currentAccountBalance.toFixed(2)}</p>
        <p><strong>Overdue Balance:</strong> ${factSheet.overdueBalance.toFixed(2)}</p>
        <p><strong>Years of Experience:</strong> {factSheet.yearsOfExperience}</p>
        <p><strong>Insurance Expiry:</strong> {factSheet.insuranceExpiry}</p>
        <p><strong>Violations Record:</strong> {factSheet.violationsRecord}</p>
      </div>
    </div>
  );
};

export default FactSheetView;