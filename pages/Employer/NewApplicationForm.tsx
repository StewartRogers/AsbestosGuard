
import React, { useState, useEffect } from 'react';
import { LicenseApplication, ApplicationStatus, LicenseType, Associate, ApplicationWizardData, EmployerFactSheet } from '../../types';
import { Button, Input, Select, Card, Badge } from '../../components/UI';
import { ApplicationSummary } from '../../components/ApplicationSummary';
import { analyzeApplication } from '../../services/geminiService';
import { 
  ArrowLeft, ChevronRight, ChevronLeft, Check, AlertCircle, 
  HelpCircle, Phone, Mail, UserPlus, Trash2, Building, Calendar, Hash, Info 
} from 'lucide-react';

interface NewApplicationFormProps {
  onSubmit: (app: LicenseApplication) => void;
  onCancel: () => void;
  factSheets: EmployerFactSheet[]; // Add prop to access fact sheets for analysis
}

const STEPS = [
  { id: 1, title: 'Contact Info' },
  { id: 2, title: 'Scope of Work' },
  { id: 3, title: 'Firm Info' },
  { id: 4, title: 'Licensing History' },
  { id: 5, title: 'Associates' },
  { id: 6, title: 'Acknowledgement' },
  { id: 7, title: 'Review' },
];

// Initial State
const INITIAL_DATA: ApplicationWizardData = {
  contactFirstName: 'John', // Mock pre-fill from profile
  contactLastName: 'Doe',
  contactPhone: '5550192834',
  contactEmail: 'john.doe@example.com',
  contactRelationship: 'Owner',
  isAdultAndAuthorized: false,
  permissionToEmail: false,

  scopePerformsAbatement: false,
  scopeServiceBuildings: false,
  scopeServiceOthers: false,
  scopeTransport: false,
  scopeSurveys: false,

  firmLegalName: 'ASBESTOS TEST ACCOUNT FOR PREVENTION',
  firmAddress: '4161 SHEILA STREET, SUITE 305 RICHMOND, BC, V7C5J6',
  firmAccountNumber: '29615302',
  firmClassificationUnit: '2418 Service clean asbestos worksite (240202)',
  firmTradeName: '',
  firmWorkersCount: 0,
  firmNopDate: '',
  firmNopNumber: '',
  firmCertLevel1to4: 0,
  firmCertLevel3: 0,
  ackNonTransferable: false,

  historyRefused7Years: false,
  historyRefusedAuth: false,
  historyNonCompliance: false,
  historySuspended: false,

  associates: [],

  ackOutstandingAmounts: false,
  ackCompliance: false,
  ackEnforcement: false,
  reqWorkersCert: false,
  reqCompliance: false,
  reqRecords: false,
  reqCooperation: false,
};

const FormFooter = () => (
  <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500">
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold text-slate-700 mb-1">Have a question about your application?</h4>
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4" />
          <a href="mailto:licensing@worksafebc.com" className="hover:text-brand-600 hover:underline">licensing@worksafebc.com</a>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-slate-700 mb-1">Technical issues with completing your application?</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>Phone toll free at 1.888.855.2477</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <a href="mailto:ehelp@worksafebc.com" className="hover:text-brand-600 hover:underline">ehelp@worksafebc.com</a>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const RadioGroup = ({ 
  label, 
  name, 
  checked, 
  onChange, 
  required = false 
}: { 
  label: string, 
  name: string, 
  checked: boolean, 
  onChange: (val: boolean) => void,
  required?: boolean
}) => (
  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
    <p className="text-sm font-medium text-slate-900 mb-3">{label} {required && <span className="text-red-500">*</span>}</p>
    <div className="flex space-x-6">
      <label className="flex items-center cursor-pointer">
        <input 
          type="radio" 
          name={name}
          checked={checked === true} 
          onChange={() => onChange(true)}
          className="h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-500"
        />
        <span className="ml-2 text-sm text-slate-700">Yes</span>
      </label>
      <label className="flex items-center cursor-pointer">
        <input 
          type="radio" 
          name={name}
          checked={checked === false} 
          onChange={() => onChange(false)}
          className="h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-500"
        />
        <span className="ml-2 text-sm text-slate-700">No</span>
      </label>
    </div>
  </div>
);

const NewApplicationForm: React.FC<NewApplicationFormProps> = ({ onSubmit, onCancel, factSheets }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ApplicationWizardData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const updateData = (updates: Partial<ApplicationWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setError(null);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\d{10}$/.test(phone.replace(/\D/g, ''));

  const validateStep = (step: number): boolean => {
    setError(null);
    switch(step) {
      case 1: // Contact
        if (!data.contactFirstName || !data.contactLastName) {
          setError("First and Last Name are required."); return false;
        }
        if (!validatePhone(data.contactPhone)) {
          setError("Please enter a valid 10-digit phone number."); return false;
        }
        if (!validateEmail(data.contactEmail)) {
          setError("Please enter a valid email address."); return false;
        }
        if (!data.isAdultAndAuthorized) {
          setError("You must certify that you are 18+ and authorized to represent the firm."); return false;
        }
        if (!data.permissionToEmail) {
          setError("You must grant permission for WorkSafeBC to email you."); return false;
        }
        return true;
      case 3: // Firm
         if (!data.firmLegalName) {
           setError("Legal name is required."); return false;
         }
         if (!data.firmAccountNumber) {
           setError("Account number is required."); return false;
         }
         if (!data.firmAddress) {
           setError("Mailing address is required."); return false;
         }
         if (data.firmWorkersCount < 0) {
           setError("Worker counts cannot be negative."); return false;
         }
         if (!data.ackNonTransferable) {
           setError("You must acknowledge the license transferability restriction to proceed."); return false;
         }
         return true;
      case 5: // Associates
        for (const [index, asc] of data.associates.entries()) {
            if (!asc.relationship || asc.relationship === 'Please select') {
                setError(`Please select a relationship for Associate #${index + 1}.`);
                return false;
            }
            // Require either Business Name OR (First Name AND Last Name)
            const hasPersonName = asc.firstName && asc.lastName;
            const hasBusinessName = asc.businessName;
            
            if (!hasPersonName && !hasBusinessName) {
                setError(`Associate #${index + 1} must have either a person's name (First and Last) or a Firm Name.`);
                return false;
            }

            if (!asc.email || !validateEmail(asc.email)) {
                setError(`Please enter a valid email for Associate #${index + 1}.`);
                return false;
            }
            if (!asc.phone || !validatePhone(asc.phone)) {
                setError(`Please enter a valid 10-digit phone number for Associate #${index + 1}.`);
                return false;
            }
        }
        return true;
      case 6: // Acknowledgement
         // Check if all associates have history filled out
         for (const asc of data.associates) {
           if (!asc.history) {
             setError(`Please complete the declaration for associate: ${asc.businessName || (asc.firstName + ' ' + asc.lastName)}`);
             return false;
           }
         }
         // Check Acknowledgments
         if (!data.ackOutstandingAmounts || !data.ackCompliance || !data.ackEnforcement) {
             setError("You must acknowledge all items in the 'Final Acknowledgments' section.");
             return false;
         }
         // Check License Requirements
         if (!data.reqWorkersCert || !data.reqCompliance || !data.reqRecords || !data.reqCooperation) {
             setError("You must agree to all items in the 'License Requirements' section.");
             return false;
         }
         return true;
      case 7: // Final Review
         return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(7)) return;
    setIsSubmitting(true);

    const submissionDate = new Date().toISOString().split('T')[0];
    const applicantFullName = `${data.contactFirstName} ${data.contactLastName}`;

    // Construct the application object
    const newApp: LicenseApplication = {
        id: `APP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        companyName: data.firmLegalName, // Use edited firm name
        applicantName: applicantFullName,
        email: data.contactEmail,
        phone: data.contactPhone,
        address: data.firmAddress, // Use edited address
        licenseType: LicenseType.CLASS_A, // Derived from data or defaulted
        status: ApplicationStatus.SUBMITTED,
        submissionDate: submissionDate,
        lastUpdated: submissionDate,
        lastEditedBy: applicantFullName,
        safetyHistory: {
          hasViolations: data.historyNonCompliance || data.historyRefused7Years,
          yearsExperience: 5, // Derived
          insuranceExpiry: '2025-01-01',
          violationDetails: data.historyNonCompliance ? "See detailed history." : undefined
        },
        documents: [], 
        wizardData: data
    };

    try {
        // Attempt to find matching Fact Sheet for Analysis Context (by Account Number only)
        const matchedFactSheet = factSheets.find(
          fs => fs.employerId === data.firmAccountNumber
        );

        // Debug: Log factSheets and matching details
        console.log('NewApplicationForm: factSheets count:', factSheets.length);
        console.log('NewApplicationForm: data.firmAccountNumber:', data.firmAccountNumber);
        console.log('NewApplicationForm: data.firmLegalName:', data.firmLegalName);
        console.log('NewApplicationForm: matchedFactSheet:', matchedFactSheet ? 'Found' : 'Not Found', matchedFactSheet);

        // Run AI Analysis before submitting
        const analysis = await analyzeApplication(newApp, matchedFactSheet);
        newApp.aiAnalysis = JSON.stringify(analysis);
    } catch (e) {
        console.error("AI Analysis failed on submit", e);
    }

    // Submit
    onSubmit(newApp);
    setIsSubmitting(false);
  };

  // --- Render Steps ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-blue-50 p-4 rounded-md flex items-start">
        <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          We have pre-filled some information from your online services profile. Please verify it is correct.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="First Name" value={data.contactFirstName} onChange={(e) => updateData({ contactFirstName: e.target.value })} />
        <Input label="Last Name" value={data.contactLastName} onChange={(e) => updateData({ contactLastName: e.target.value })} />
        <Input label="Phone Number" value={data.contactPhone} placeholder="10 digits only" onChange={(e) => updateData({ contactPhone: e.target.value })} />
        <Input label="Email Address" type="email" value={data.contactEmail} onChange={(e) => updateData({ contactEmail: e.target.value })} />
      </div>

      <Select 
        label="Relationship to Firm"
        value={data.contactRelationship}
        onChange={(e) => updateData({ contactRelationship: e.target.value })}
        options={[
          { value: 'Owner', label: 'Owner' },
          { value: 'Director', label: 'Director' },
          { value: 'Officer', label: 'Officer' },
          { value: 'Proprietor', label: 'Proprietor' },
          { value: 'Shareholder', label: 'Shareholder' },
        ]}
      />

      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-semibold text-slate-900">Authorization</h3>
        <label className="flex items-start p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
          <input 
            type="checkbox" 
            checked={data.isAdultAndAuthorized} 
            onChange={(e) => updateData({ isAdultAndAuthorized: e.target.checked })}
            className="mt-1 h-4 w-4 text-brand-600 rounded focus:ring-brand-500" 
          />
          <span className="ml-3 text-sm text-slate-700">
            I certify that I am 18 years of age or older and authorized to represent the firm in this application.
          </span>
        </label>
        <label className="flex items-start p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
          <input 
            type="checkbox" 
            checked={data.permissionToEmail} 
            onChange={(e) => updateData({ permissionToEmail: e.target.checked })}
            className="mt-1 h-4 w-4 text-brand-600 rounded focus:ring-brand-500" 
          />
          <span className="ml-3 text-sm text-slate-700">
            I grant permission for WorkSafeBC to send emails containing personal information regarding this application.
          </span>
        </label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-slate-900">Scope of Asbestos Abatement Work</h3>
        <p className="text-sm text-slate-500 mt-1">
          Please answer yes or no to the following regarding your business activities.
          <a href="#" className="ml-1 text-brand-600 underline">View resources</a>
        </p>
      </div>

      <div className="space-y-4">
        <RadioGroup 
          label="Does your firm perform asbestos abatement work as defined by the Act?"
          name="scopeAbatement"
          checked={data.scopePerformsAbatement}
          onChange={(val) => updateData({ scopePerformsAbatement: val })}
        />
        <RadioGroup 
          label="Does your firm provide asbestos abatement services in relation to buildings?"
          name="scopeBuildings"
          checked={data.scopeServiceBuildings}
          onChange={(val) => updateData({ scopeServiceBuildings: val })}
        />
        <RadioGroup 
          label="Does your firm offer asbestos abatement services to others outside of your firm (i.e., to customers)?"
          name="scopeOthers"
          checked={data.scopeServiceOthers}
          onChange={(val) => updateData({ scopeServiceOthers: val })}
        />
        <RadioGroup 
          label="Does your firm transport asbestos-containing materials?"
          name="scopeTransport"
          checked={data.scopeTransport}
          onChange={(val) => updateData({ scopeTransport: val })}
        />
        <RadioGroup 
          label="Does your firm perform building surveys for the purposes of asbestos abatement?"
          name="scopeSurveys"
          checked={data.scopeSurveys}
          onChange={(val) => updateData({ scopeSurveys: val })}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Section: Firm information</h3>
        <p className="text-sm text-slate-600 mt-2">
          Specific profile details for your firm’s account information. Please ensure these details are correct.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
                label="Account number" 
                value={data.firmAccountNumber}
                onChange={(e) => updateData({ firmAccountNumber: e.target.value })}
            />
            <Input 
                label="Legal name" 
                value={data.firmLegalName}
                onChange={(e) => updateData({ firmLegalName: e.target.value })}
            />
            <Input 
                label="Trade name (optional)" 
                value={data.firmTradeName}
                onChange={(e) => updateData({ firmTradeName: e.target.value })}
                placeholder="(empty)"
            />
             <Input 
                label="Classification unit" 
                value={data.firmClassificationUnit}
                onChange={(e) => updateData({ firmClassificationUnit: e.target.value })}
            />
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Mailing address</label>
                <textarea 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    rows={2}
                    value={data.firmAddress}
                    onChange={(e) => updateData({ firmAddress: e.target.value })}
                />
            </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded p-4">
        <label className="flex items-start cursor-pointer">
          <input 
            type="checkbox" 
            checked={data.ackNonTransferable} 
            onChange={(e) => updateData({ ackNonTransferable: e.target.checked })}
            className="mt-1 h-4 w-4 text-brand-600 rounded focus:ring-brand-500 flex-shrink-0" 
          />
          <span className="ml-3 text-sm text-blue-900 font-medium leading-relaxed">
            I understand licenses are non-transferable and a separate application is required for each firm (i.e. for each WorkSafeBC account).
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">What is the date or number of the most recent Notice of Project (NOP)?</label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="w-full sm:w-1/2">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type="date" 
                        className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        value={data.firmNopDate}
                        onChange={(e) => updateData({ firmNopDate: e.target.value, firmNopNumber: '' })}
                    />
                </div>
            </div>
            <span className="text-sm font-bold text-slate-500">OR</span>
            <div className="w-full sm:w-1/2">
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type="text"
                        placeholder="NOP Number (e.g. NOP-12345)"
                        className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        value={data.firmNopNumber}
                        onChange={(e) => updateData({ firmNopNumber: e.target.value, firmNopDate: '' })}
                    />
                </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Leave blank if not applicable.</p>
        </div>

        <Input 
          label="How many workers are currently employed at your firm?" 
          type="number" 
          min="0"
          value={data.firmWorkersCount}
          onChange={(e) => updateData({ firmWorkersCount: parseInt(e.target.value) || 0 })}
        />
        <Input 
          label="How many workers have a valid WorkSafeBC asbestos certificate (Level 1, 2, 3, or 4)?" 
          type="number" 
          min="0"
          value={data.firmCertLevel1to4}
          onChange={(e) => updateData({ firmCertLevel1to4: parseInt(e.target.value) || 0 })}
        />
        <Input 
          label="How many workers have a valid WorkSafeBC Level 3 asbestos certificate?" 
          type="number" 
          min="0"
          value={data.firmCertLevel3}
          onChange={(e) => updateData({ firmCertLevel3: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
        <h4 className="text-amber-800 font-medium flex items-center mb-2">
          <AlertCircle className="w-4 h-4 mr-2" /> Important Information
        </h4>
        <div className="text-sm text-amber-800 space-y-3">
          <p>We may refuse to issue a licence if the applicant, or firm or person associated with the applicant has:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Been refused a licence within the last seven years in relation to asbestos abatement</li>
            <li>Been refused a licence or similar authorization in relation to asbestos abatement in B.C. or another jurisdiction (i.e., another province or country)</li>
            <li>Held a licence or similar authorization in relation to asbestos abatement in B.C. or another jurisdiction that has been suspended or cancelled</li>
          </ul>

          <p className="font-medium mt-2">Examples of similar authorizations include:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hazardous Materials Abatement Licence – Alberta</li>
            <li>Nova Scotia Asbestos Abatement Contractor’s Certificate</li>
            <li>Newfoundland and Labrador Asbestos Abatement Contractor Certificate</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <RadioGroup 
          label="Does your firm currently hold a licence in relation to asbestos abatement activities in B.C. or another jurisdiction, or has it held one in the last seven years?"
          name="histRefused"
          checked={data.historyRefused7Years}
          onChange={(val) => updateData({ historyRefused7Years: val })}
        />
        <RadioGroup 
          label="Have you or your firm been refused a licence or similar authorization in relation to asbestos abatement in B.C. or another jurisdiction at any point in the last seven years?"
          name="histAuth"
          checked={data.historyRefusedAuth}
          onChange={(val) => updateData({ historyRefusedAuth: val })}
        />
        <RadioGroup 
          label="Has your firm failed to comply with a term or condition of a licence in relation to asbestos abatement in B.C. or another jurisdiction at any point in the last seven years?"
          name="histComply"
          checked={data.historyNonCompliance}
          onChange={(val) => updateData({ historyNonCompliance: val })}
        />
        <RadioGroup 
          label="Has your firm had a licence or a similar authorization suspended or cancelled in relation to asbestos abatement in B.C. or another jurisdiction at any point in the last seven years?"
          name="histSuspended"
          checked={data.historySuspended}
          onChange={(val) => updateData({ historySuspended: val })}
        />
      </div>
    </div>
  );

  const renderStep5 = () => {
    const addAssociate = () => {
      const newAssoc: Associate = {
        id: Math.random().toString(36).substr(2, 9),
        firstName: '', lastName: '', email: '', phone: '', relationship: 'Please select'
      };
      updateData({ associates: [...data.associates, newAssoc] });
    };

    const removeAssociate = (id: string) => {
      updateData({ associates: data.associates.filter(a => a.id !== id) });
    };

    const updateAssociate = (id: string, field: keyof Associate, value: string) => {
      updateData({
        associates: data.associates.map(a => a.id === id ? { ...a, [field]: value } : a)
      });
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        
        {/* Step 5 Information Text */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm text-slate-700 space-y-3 leading-relaxed">
            <h3 className="text-lg font-bold text-slate-900">Associated firms or persons</h3>
            <p>
                Associated firms or persons refers to those in a business relationship between the firm and/or persons at the time of application. The legal definition of “person” includes an individual and an individual’s heirs. The licensing process for firms and licensing requirements are intended to ensure that when firms or individuals work on asbestos projects, those conducting the work comply with rules (including the duty to ensure owners, directors, and officers who control the work comply).
            </p>
            <p className="font-semibold">Some examples of associated firms or persons include the following:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Pat is registered as an applicant for an asbestos licence. Pat is also the director of ABC Excavation Inc. In this case, both Pat and ABC Excavation are associated with the applicant.</li>
                <li>Sam is a director of Parent Corporation, which also manages two firms. Sam is also a director of Sub Corporation. Sam, Parent Corporation, and Sub Corporation are associated with the applicant.</li>
                <li>Chris is a shareholder of Firm A. Chris is also a director of Firm B. Both firms are associated with the applicant.</li>
                <li>Lee is an officer of Firm A. Lee is also an officer of Firm B. Both firms are associated with the applicant.</li>
                <li>Kim is associated with Firm A through a spouse, who is an officer, director, or shareholder of Firm A. Both Kim and Firm A are associated with the applicant.</li>
            </ul>
            <p>The licensing process considers these relationships to ensure compliance.</p>
            <p className="font-medium">List and provide contact information for any persons, directors, officers, proprietors, shareholders, and firms or persons associated with the applicant.</p>
        </div>

        {data.associates.map((assoc, index) => (
          <Card key={assoc.id} className="relative border-slate-300 shadow-sm">
            <button 
              onClick={() => removeAssociate(assoc.id)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1"
              title="Remove Associate"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 text-sm font-bold text-brand-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-2">
                  Associate #{index + 1}
              </div>
              
              <div className="md:col-span-2">
                <Select 
                    label="Individual Relationship" 
                    value={assoc.relationship}
                    onChange={(e) => updateAssociate(assoc.id, 'relationship', e.target.value)}
                    options={[
                    { value: 'Please select', label: 'Please select' },
                    { value: 'Owner', label: 'Owner' },
                    { value: 'Director', label: 'Director' },
                    { value: 'Officer', label: 'Officer' },
                    { value: 'Shareholder', label: 'Shareholder' },
                    ]}
                />
              </div>

              <div className="md:col-span-2">
                 <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Identity (Person OR Firm)</h5>
              </div>
              <Input label="First Name" value={assoc.firstName} onChange={(e) => updateAssociate(assoc.id, 'firstName', e.target.value)} />
              <Input label="Last Name" value={assoc.lastName} onChange={(e) => updateAssociate(assoc.id, 'lastName', e.target.value)} />
              <div className="md:col-span-2">
                 <Input label="Business Name (if applicable)" value={assoc.businessName || ''} onChange={(e) => updateAssociate(assoc.id, 'businessName', e.target.value)} placeholder="e.g. ABC Excavation Inc." />
              </div>
              
              <div className="md:col-span-2 mt-2">
                 <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Contact Information</h5>
              </div>
              <Input label="Email Address" value={assoc.email} onChange={(e) => updateAssociate(assoc.id, 'email', e.target.value)} />
              <Input label="Phone Number" value={assoc.phone} onChange={(e) => updateAssociate(assoc.id, 'phone', e.target.value)} />
            </div>
          </Card>
        ))}

        <Button onClick={addAssociate} variant="outline" className="w-full border-dashed border-2 py-4 text-slate-600 hover:text-brand-600 hover:border-brand-300">
          <UserPlus className="w-5 h-5 mr-2" /> Add Associated Person or Firm
        </Button>

        {/* Step 5 Footer / Help Text */}
        <div className="mt-6 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded text-sm text-slate-600">
            <h5 className="font-bold text-slate-800 mb-2 flex items-center"><Info className="w-4 h-4 mr-2"/> Help with associations:</h5>
            <ul className="space-y-1 list-disc pl-5">
                <li>Person associated with the applicant</li>
                <li>Firm associated with the applicant</li>
                <li>Person associated through marriage/common-law</li>
            </ul>
            <p className="mt-3 font-medium">Questions? Call 1.888.621.3677 or email <a href="mailto:ehsl@worksafebc.com" className="text-brand-600 underline">ehsl@worksafebc.com</a></p>
        </div>

      </div>
    );
  };

  const renderStep6 = () => {
    
    const updateHistory = (assocId: string, field: keyof NonNullable<Associate['history']>, value: boolean) => {
      const newAssociates = data.associates.map(a => {
        if (a.id !== assocId) return a;
        const currentHistory = a.history || {
          cancelledOrRefused: false,
          enforcementAction: false,
          criminalCivilProcess: false,
          asbestosEnforcement: false
        };
        return {
          ...a,
          history: { ...currentHistory, [field]: value }
        };
      });
      updateData({ associates: newAssociates });
    };

    return (
      <div className="space-y-8 animate-fadeIn">
         <div className="mb-4">
          <h3 className="text-lg font-medium text-slate-900">Acknowledgement & Declarations</h3>
          <p className="text-sm text-slate-500 mt-1">
            Please complete the following declarations and acknowledgments.
          </p>
        </div>

        {data.associates.length > 0 && (
            <div className="space-y-6">
                 <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Declarations for Associated Entities</h4>
                 {data.associates.map((assoc, index) => {
                    const displayName = assoc.businessName || `${assoc.firstName} ${assoc.lastName}`;
                    return (
                        <div key={assoc.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                            {index + 1}. {displayName} <span className="text-slate-400 font-normal">({assoc.relationship})</span>
                            </h4>
                            
                            <div className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-slate-700 w-3/4">Has this person/firm ever had a licence cancelled or refused?</span>
                                <div className="flex space-x-4">
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.cancelledOrRefused === true} onChange={() => updateHistory(assoc.id, 'cancelledOrRefused', true)} className="mr-2" /> Yes</label>
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.cancelledOrRefused === false} onChange={() => updateHistory(assoc.id, 'cancelledOrRefused', false)} className="mr-2" /> No</label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 bg-slate-50 rounded px-2">
                                <span className="text-sm text-slate-700 w-3/4">Has any enforcement action been taken against them?</span>
                                <div className="flex space-x-4">
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.enforcementAction === true} onChange={() => updateHistory(assoc.id, 'enforcementAction', true)} className="mr-2" /> Yes</label>
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.enforcementAction === false} onChange={() => updateHistory(assoc.id, 'enforcementAction', false)} className="mr-2" /> No</label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-slate-700 w-3/4">Are they involved in any criminal or civil process?</span>
                                <div className="flex space-x-4">
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.criminalCivilProcess === true} onChange={() => updateHistory(assoc.id, 'criminalCivilProcess', true)} className="mr-2" /> Yes</label>
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.criminalCivilProcess === false} onChange={() => updateHistory(assoc.id, 'criminalCivilProcess', false)} className="mr-2" /> No</label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 bg-slate-50 rounded px-2">
                                <span className="text-sm text-slate-700 w-3/4">Was the enforcement action related to asbestos work?</span>
                                <div className="flex space-x-4">
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.asbestosEnforcement === true} onChange={() => updateHistory(assoc.id, 'asbestosEnforcement', true)} className="mr-2" /> Yes</label>
                                <label className="flex items-center"><input type="radio" checked={assoc.history?.asbestosEnforcement === false} onChange={() => updateHistory(assoc.id, 'asbestosEnforcement', false)} className="mr-2" /> No</label>
                                </div>
                            </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        <section>
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Final Acknowledgments</h4>
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                <label className="flex items-start p-4 hover:bg-slate-50 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={data.ackOutstandingAmounts}
                    onChange={(e) => updateData({ ackOutstandingAmounts: e.target.checked })}
                    className="mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <div className="ml-3">
                    <span className="block text-sm font-medium text-slate-900">Outstanding Amounts</span>
                    <span className="block text-sm text-slate-500">I acknowledge that outstanding amounts owing to WorkSafeBC may affect the outcome of this application.</span>
                    </div>
                </label>
                <label className="flex items-start p-4 hover:bg-slate-50 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={data.ackCompliance}
                    onChange={(e) => updateData({ ackCompliance: e.target.checked })}
                    className="mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <div className="ml-3">
                    <span className="block text-sm font-medium text-slate-900">Act & OHS Regulation</span>
                    <span className="block text-sm text-slate-500">I certify that our firm is in compliance with the Act and OHS Regulation.</span>
                    </div>
                </label>
                <label className="flex items-start p-4 hover:bg-slate-50 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={data.ackEnforcement}
                    onChange={(e) => updateData({ ackEnforcement: e.target.checked })}
                    className="mt-1 h-5 w-5 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <div className="ml-3">
                    <span className="block text-sm font-medium text-slate-900">Enforcement Activities</span>
                    <span className="block text-sm text-slate-500">I understand that past enforcement activities (penalties, stop-work orders, injunctions, etc.) are considered during review.</span>
                    </div>
                </label>
            </div>
        </section>

        <section>
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">License Requirements</h4>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4">
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={data.reqWorkersCert} 
                        onChange={(e) => updateData({ reqWorkersCert: e.target.checked })}
                        className="h-4 w-4 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <span className="ml-3 text-sm text-slate-700">Workers must have valid WorkSafeBC asbestos certificate.</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={data.reqCompliance} 
                        onChange={(e) => updateData({ reqCompliance: e.target.checked })}
                        className="h-4 w-4 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <span className="ml-3 text-sm text-slate-700">Ongoing compliance with Act and OHS Regulation.</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={data.reqRecords} 
                        onChange={(e) => updateData({ reqRecords: e.target.checked })}
                        className="h-4 w-4 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <span className="ml-3 text-sm text-slate-700">Submission of records/documents as required by the Board.</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={data.reqCooperation} 
                        onChange={(e) => updateData({ reqCooperation: e.target.checked })}
                        className="h-4 w-4 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <span className="ml-3 text-sm text-slate-700">Full cooperation with inspectors.</span>
                </label>
            </div>
        </section>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Stepper Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-8">
            <button 
                onClick={onCancel}
                className="flex items-center text-slate-500 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Exit Application</span>
                <span className="sm:hidden">Exit</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900 text-center flex-grow mx-4">
              {STEPS[currentStep-1].title}
            </h2>
            <div className="text-sm font-medium text-slate-500 whitespace-nowrap">
                Step {currentStep} / {STEPS.length}
            </div>
        </div>

        {/* Visual Stepper */}
        <div className="relative mx-auto px-2">
            {/* Connecting Lines */}
            <div className="absolute top-4 left-2 right-2 h-0.5 bg-slate-200 -z-10 rounded"></div>
            <div 
                className="absolute top-4 left-2 h-0.5 bg-brand-600 -z-10 rounded transition-all duration-500 ease-in-out" 
                style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 1rem + ${((currentStep - 1) / (STEPS.length - 1)) * 2}rem)` }}
            ></div>
             
             <div 
                className="absolute top-4 left-4 h-0.5 bg-brand-600 -z-10 rounded transition-all duration-500 ease-in-out" 
                style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 2rem)` }} 
             ></div>


            <div className="flex justify-between relative">
                {STEPS.map((step, index) => {
                    const stepNum = index + 1;
                    const isCompleted = stepNum < currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center group cursor-default">
                            <div 
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 z-10
                                    ${isCompleted 
                                        ? 'bg-brand-600 border-brand-600 text-white' 
                                        : isCurrent 
                                            ? 'bg-white border-brand-600 text-brand-600 shadow-md scale-110' 
                                            : 'bg-slate-50 border-slate-300 text-slate-400'}
                                `}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
                            </div>
                            <div className={`
                                mt-2 text-[10px] sm:text-xs font-medium text-center max-w-[60px] sm:max-w-[80px] leading-tight transition-colors duration-300 hidden sm:block
                                ${isCurrent ? 'text-brand-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}
                            `}>
                                {step.title}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Percentage Progress Bar */}
        <div className="mt-8 mb-2 px-2">
            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Total Progress</span>
                <span>{Math.round(((currentStep - 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                    className="bg-brand-600 h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${Math.round(((currentStep - 1) / STEPS.length) * 100)}%` }}
                ></div>
            </div>
        </div>
      </div>

      <Card>
        <div className="min-h-[400px] flex flex-col">
            <div className="flex-grow p-1">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
                {currentStep === 6 && renderStep6()}
                {currentStep === 7 && (
                  <ApplicationSummary 
                    data={data} 
                    onEditStep={(step) => setCurrentStep(step)} 
                  />
                )}
                
                {error && (
                    <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200 flex items-start animate-pulse">
                        <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                        <div>
                          <span className="font-bold block mb-1">Please correct the following:</span>
                          {error}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-8 mt-8 border-t border-slate-100">
                <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={currentStep === 1 ? onCancel : handlePrev}
                    disabled={isSubmitting}
                >
                    {currentStep === 1 ? 'Exit' : (
                        <>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back
                        </>
                    )}
                </Button>

                {currentStep < STEPS.length ? (
                    <Button type="button" onClick={handleNext}>
                        Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSubmit} 
                        isLoading={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    >
                        Submit Application <Check className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
            
            <FormFooter />
        </div>
      </Card>
    </div>
  );
};

export default NewApplicationForm;
