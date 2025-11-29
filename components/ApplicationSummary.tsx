import React from 'react';
import { ApplicationWizardData } from '../types';
import { Button } from './UI';

interface ApplicationSummaryProps {
  data: ApplicationWizardData;
  onEditStep?: (step: number) => void;
}

export const ApplicationSummary: React.FC<ApplicationSummaryProps> = ({ data, onEditStep }) => {
  const isReadOnly = !onEditStep;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Review Section */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
           <h3 className="text-lg font-bold text-slate-900">Application Data Summary</h3>
           {!isReadOnly && <p className="text-sm text-slate-500">Please review all your entries before submitting.</p>}
        </div>
        
        <div className="divide-y divide-slate-100">
            {/* Contact Info */}
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-semibold text-slate-800">1. Contact Information</h4>
                    {onEditStep && <Button variant="outline" className="text-xs h-8" onClick={() => onEditStep(1)}>Edit</Button>}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <dt className="text-slate-500">Name</dt>
                        <dd className="font-medium text-slate-900">{data.contactFirstName} {data.contactLastName}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Phone</dt>
                        <dd className="font-medium text-slate-900">{data.contactPhone}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Email</dt>
                        <dd className="font-medium text-slate-900">{data.contactEmail}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Relationship</dt>
                        <dd className="font-medium text-slate-900">{data.contactRelationship}</dd>
                    </div>
                </dl>
            </div>

            {/* Scope */}
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-semibold text-slate-800">2. Scope of Work</h4>
                    {onEditStep && <Button variant="outline" className="text-xs h-8" onClick={() => onEditStep(2)}>Edit</Button>}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                   <div><dt className="text-slate-500">Performs Abatement?</dt><dd className="font-medium text-slate-900">{data.scopePerformsAbatement ? 'Yes' : 'No'}</dd></div>
                   <div><dt className="text-slate-500">Services Buildings?</dt><dd className="font-medium text-slate-900">{data.scopeServiceBuildings ? 'Yes' : 'No'}</dd></div>
                   <div><dt className="text-slate-500">Services for Others?</dt><dd className="font-medium text-slate-900">{data.scopeServiceOthers ? 'Yes' : 'No'}</dd></div>
                   <div><dt className="text-slate-500">Transports Materials?</dt><dd className="font-medium text-slate-900">{data.scopeTransport ? 'Yes' : 'No'}</dd></div>
                   <div><dt className="text-slate-500">Performs Surveys?</dt><dd className="font-medium text-slate-900">{data.scopeSurveys ? 'Yes' : 'No'}</dd></div>
                </dl>
            </div>

            {/* Firm */}
             <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-semibold text-slate-800">3. Firm Information</h4>
                    {onEditStep && <Button variant="outline" className="text-xs h-8" onClick={() => onEditStep(3)}>Edit</Button>}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div><dt className="text-slate-500">Trade Name</dt><dd className="font-medium text-slate-900">{data.firmTradeName || 'N/A'}</dd></div>
                    <div><dt className="text-slate-500">Recent NOP</dt><dd className="font-medium text-slate-900">{data.firmNopDate || data.firmNopNumber || 'None'}</dd></div>
                    <div><dt className="text-slate-500">Total Workers</dt><dd className="font-medium text-slate-900">{data.firmWorkersCount}</dd></div>
                    <div><dt className="text-slate-500">Cert. Level 1-4</dt><dd className="font-medium text-slate-900">{data.firmCertLevel1to4}</dd></div>
                    <div><dt className="text-slate-500">Cert. Level 3</dt><dd className="font-medium text-slate-900">{data.firmCertLevel3}</dd></div>
                </dl>
            </div>

            {/* History */}
             <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-semibold text-slate-800">4. Licensing History</h4>
                    {onEditStep && <Button variant="outline" className="text-xs h-8" onClick={() => onEditStep(4)}>Edit</Button>}
                </div>
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between"><span className="text-slate-500">Refused License (7 Years)?</span><span className="font-medium text-slate-900">{data.historyRefused7Years ? 'Yes' : 'No'}</span></div>
                   <div className="flex justify-between"><span className="text-slate-500">Refused Authorization?</span><span className="font-medium text-slate-900">{data.historyRefusedAuth ? 'Yes' : 'No'}</span></div>
                   <div className="flex justify-between"><span className="text-slate-500">Failed Compliance?</span><span className="font-medium text-slate-900">{data.historyNonCompliance ? 'Yes' : 'No'}</span></div>
                   <div className="flex justify-between"><span className="text-slate-500">Suspended/Cancelled?</span><span className="font-medium text-slate-900">{data.historySuspended ? 'Yes' : 'No'}</span></div>
                </div>
            </div>

            {/* Associates */}
             <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-semibold text-slate-800">5. Associates</h4>
                    {onEditStep && <Button variant="outline" className="text-xs h-8" onClick={() => onEditStep(5)}>Edit</Button>}
                </div>
                {data.associates.length > 0 ? (
                    <ul className="text-sm space-y-2">
                        {data.associates.map((assoc, i) => (
                            <li key={i} className="flex justify-between border-b border-slate-50 pb-2">
                                <span>{assoc.businessName ? assoc.businessName : `${assoc.firstName} ${assoc.lastName}`} ({assoc.relationship})</span>
                                <span className="text-slate-500">{assoc.email}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-500">No associates declared.</p>
                )}
            </div>
        </div>
      </section>

      {/* Acknowledgment Section */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Final Acknowledgments</h3>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          <label className="flex items-start p-4 hover:bg-slate-50">
            <input 
               type="checkbox" 
               checked={data.ackOutstandingAmounts}
               readOnly={true}
               disabled={isReadOnly}
               className="mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500 disabled:opacity-70" 
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-slate-900">Outstanding Amounts</span>
              <span className="block text-sm text-slate-500">I acknowledge that outstanding amounts owing to WorkSafeBC may affect the outcome of this application.</span>
            </div>
          </label>
          <label className="flex items-start p-4 hover:bg-slate-50">
            <input 
               type="checkbox" 
               checked={data.ackCompliance}
               readOnly={true}
               disabled={isReadOnly}
               className="mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500 disabled:opacity-70" 
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-slate-900">Act & OHS Regulation</span>
              <span className="block text-sm text-slate-500">I certify that our firm is in compliance with the Act and OHS Regulation.</span>
            </div>
          </label>
          <label className="flex items-start p-4 hover:bg-slate-50">
            <input 
               type="checkbox" 
               checked={data.ackEnforcement}
               readOnly={true}
               disabled={isReadOnly}
               className="mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500 disabled:opacity-70" 
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-slate-900">Enforcement Activities</span>
              <span className="block text-sm text-slate-500">I understand that past enforcement activities (penalties, stop-work orders, injunctions, etc.) are considered during review.</span>
            </div>
          </label>
        </div>
      </section>

      {/* License Requirements Section */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">License Requirements</h3>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4">
          <label className="flex items-center">
            <input type="checkbox" checked={data.reqWorkersCert} readOnly disabled={isReadOnly} className="h-4 w-4 text-brand-600 rounded disabled:opacity-70" />
            <span className="ml-3 text-sm text-slate-700">Workers must have valid WorkSafeBC asbestos certificate.</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={data.reqCompliance} readOnly disabled={isReadOnly} className="h-4 w-4 text-brand-600 rounded disabled:opacity-70" />
            <span className="ml-3 text-sm text-slate-700">Ongoing compliance with Act and OHS Regulation.</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={data.reqRecords} readOnly disabled={isReadOnly} className="h-4 w-4 text-brand-600 rounded disabled:opacity-70" />
            <span className="ml-3 text-sm text-slate-700">Submission of records/documents as required by the Board.</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={data.reqCooperation} readOnly disabled={isReadOnly} className="h-4 w-4 text-brand-600 rounded disabled:opacity-70" />
            <span className="ml-3 text-sm text-slate-700">Full cooperation with inspectors.</span>
          </label>
        </div>
      </section>
    </div>
  );
};
