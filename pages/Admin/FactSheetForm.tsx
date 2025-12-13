

import React, { useState } from 'react';
import { EmployerFactSheet } from '../../types';
import { Button, Input, Card, Select } from '../../components/UI';
import { ArrowLeft } from 'lucide-react';

interface FactSheetFormProps {
  onSubmit: (data: EmployerFactSheet | Omit<EmployerFactSheet, 'id'>) => void;
  onCancel: () => void;
  initialData?: EmployerFactSheet | null;
}

const FactSheetForm: React.FC<FactSheetFormProps> = ({ onSubmit, onCancel, initialData = null }) => {
  const [data, setData] = useState<Omit<EmployerFactSheet, 'id'>>({
    employerLegalName: '',
    employerTradeName: '',
    employerId: '',
    activeStatus: 'Active',
    accountCoverage: 'Personal Optional Protection',
    firmType: 'Corporation',
    employerStartDate: '',
    classificationUnit: '',
    employerCuStartDate: '',
    overdueBalance: 0,
    currentAccountBalance: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData && initialData.id) {
      onSubmit({ id: initialData.id, ...data } as EmployerFactSheet);
    } else {
      onSubmit(data);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setData({ ...data, [e.target.name]: value });
  };

  const isValid = data.employerLegalName && data.employerId && data.classificationUnit;

  // Populate form when editing
  React.useEffect(() => {
    if (initialData) {
      const { id, ...rest } = initialData;
      setData(rest as Omit<EmployerFactSheet, 'id'>);
    }
  }, [initialData]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <button 
        onClick={onCancel}
        className="flex items-center text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to List
      </button>

      <Card title={initialData ? 'Edit Employer Fact Sheet' : 'New Employer Fact Sheet'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2">
                <Input 
                    label="Employer Legal Name" 
                    name="employerLegalName"
                    value={data.employerLegalName}
                    onChange={handleChange}
                    placeholder="e.g. Acme Construction Ltd."
                />
            </div>
            
            <Input 
                label="Employer Trade Name" 
                name="employerTradeName"
                value={data.employerTradeName}
                onChange={handleChange}
                placeholder="e.g. Acme Builders"
            />
            
            <Input 
                label="Employer ID" 
                name="employerId"
                value={data.employerId}
                onChange={handleChange}
                placeholder="e.g. 29615302"
            />

            <Select 
                label="Active Status" 
                name="activeStatus"
                value={data.activeStatus}
                onChange={handleChange}
                options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                    { value: 'Closed', label: 'Closed' }
                ]}
            />

            <Select 
                label="Account Coverage" 
                name="accountCoverage"
                value={data.accountCoverage}
                onChange={handleChange}
                options={[
                    { value: 'Personal Optional Protection', label: 'Personal Optional Protection' },
                    { value: 'Mandatory', label: 'Mandatory' },
                    { value: 'Voluntary', label: 'Voluntary' }
                ]}
            />
             
             <Select 
                label="Firm Type" 
                name="firmType"
                value={data.firmType}
                onChange={handleChange}
                options={[
                    { value: 'Corporation', label: 'Corporation' },
                    { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
                    { value: 'Partnership', label: 'Partnership' }
                ]}
            />

            <Input 
                label="Employer Start Date" 
                type="date"
                name="employerStartDate"
                value={data.employerStartDate}
                onChange={handleChange}
            />

            <Input 
                label="Classification Unit (CU)" 
                name="classificationUnit"
                value={data.classificationUnit}
                onChange={handleChange}
                placeholder="e.g. 721021"
            />

            <Input 
                label="Employer CU Start Date" 
                type="date"
                name="employerCuStartDate"
                value={data.employerCuStartDate}
                onChange={handleChange}
            />

            <Input 
                label="Overdue Balance ($)" 
                type="number"
                step="0.01"
                name="overdueBalance"
                value={data.overdueBalance}
                onChange={handleChange}
            />

            <Input 
                label="Current Account Balance ($)" 
                type="number"
                step="0.01"
                name="currentAccountBalance"
                value={data.currentAccountBalance}
                onChange={handleChange}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!isValid}>Save Record</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FactSheetForm;