import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Button, Input, Card, Select } from '../../components/UI';
import { ArrowLeft } from 'lucide-react';
const FactSheetForm = ({ onSubmit, onCancel, initialData = null }) => {
    const [data, setData] = useState({
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
    const handleSubmit = (e) => {
        e.preventDefault();
        if (initialData && initialData.id) {
            onSubmit({ id: initialData.id, ...data });
        }
        else {
            onSubmit(data);
        }
    };
    const handleChange = (e) => {
        const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        setData({ ...data, [e.target.name]: value });
    };
    const isValid = data.employerLegalName && data.employerId && data.classificationUnit;
    // Populate form when editing
    React.useEffect(() => {
        if (initialData) {
            const { id, ...rest } = initialData;
            setData(rest);
        }
    }, [initialData]);
    return (_jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8", children: [_jsxs("button", { onClick: onCancel, className: "flex items-center text-slate-500 hover:text-slate-900 mb-6", children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-1" }), "Back to List"] }), _jsx(Card, { title: initialData ? 'Edit Employer Fact Sheet' : 'New Employer Fact Sheet', children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx("div", { className: "md:col-span-2", children: _jsx(Input, { label: "Employer Legal Name", name: "employerLegalName", value: data.employerLegalName, onChange: handleChange, placeholder: "e.g. Acme Construction Ltd." }) }), _jsx(Input, { label: "Employer Trade Name", name: "employerTradeName", value: data.employerTradeName, onChange: handleChange, placeholder: "e.g. Acme Builders" }), _jsx(Input, { label: "Employer ID", name: "employerId", value: data.employerId, onChange: handleChange, placeholder: "e.g. 29615302" }), _jsx(Select, { label: "Active Status", name: "activeStatus", value: data.activeStatus, onChange: handleChange, options: [
                                        { value: 'Active', label: 'Active' },
                                        { value: 'Inactive', label: 'Inactive' },
                                        { value: 'Closed', label: 'Closed' }
                                    ] }), _jsx(Select, { label: "Account Coverage", name: "accountCoverage", value: data.accountCoverage, onChange: handleChange, options: [
                                        { value: 'Personal Optional Protection', label: 'Personal Optional Protection' },
                                        { value: 'Mandatory', label: 'Mandatory' },
                                        { value: 'Voluntary', label: 'Voluntary' }
                                    ] }), _jsx(Select, { label: "Firm Type", name: "firmType", value: data.firmType, onChange: handleChange, options: [
                                        { value: 'Corporation', label: 'Corporation' },
                                        { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
                                        { value: 'Partnership', label: 'Partnership' }
                                    ] }), _jsx(Input, { label: "Employer Start Date", type: "date", name: "employerStartDate", value: data.employerStartDate, onChange: handleChange }), _jsx(Input, { label: "Classification Unit (CU)", name: "classificationUnit", value: data.classificationUnit, onChange: handleChange, placeholder: "e.g. 721021" }), _jsx(Input, { label: "Employer CU Start Date", type: "date", name: "employerCuStartDate", value: data.employerCuStartDate, onChange: handleChange }), _jsx(Input, { label: "Overdue Balance ($)", type: "number", step: "0.01", name: "overdueBalance", value: data.overdueBalance, onChange: handleChange }), _jsx(Input, { label: "Current Account Balance ($)", type: "number", step: "0.01", name: "currentAccountBalance", value: data.currentAccountBalance, onChange: handleChange })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-6 border-t border-slate-100", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onCancel, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: !isValid, children: "Save Record" })] })] }) })] }));
};
export default FactSheetForm;
