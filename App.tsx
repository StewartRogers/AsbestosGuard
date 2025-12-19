import React, { useState, useEffect } from 'react';
import { ViewState, LicenseApplication, ApplicationStatus, LicenseType, ApplicationWizardData, EmployerFactSheet } from './types';
import LandingPage from './pages/Landing';
import EmployerDashboard from './pages/Employer/EmployerDashboard';
import NewApplicationForm from './pages/Employer/NewApplicationForm';
import ApplicationDetail from './pages/Employer/ApplicationDetail';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ApplicationReview from './pages/Admin/ApplicationReview';
import FactSheetList from './pages/Admin/FactSheetList';
import FactSheetForm from './pages/Admin/FactSheetForm';
import { ShieldCheck } from 'lucide-react';
import FactSheetView from './pages/Admin/FactSheetView';
import { deleteFactSheet, updateFactSheet, createFactSheet, getApplications, createApplication, updateApplication, deleteApplication, getFactSheets } from './services/apiService';

// Default mock wizard data to ensure the new Detail view works for existing mock items
const DEFAULT_MOCK_WIZARD_DATA: ApplicationWizardData = {
  contactFirstName: 'John',
  contactLastName: 'Doe',
  contactPhone: '5550123456',
  contactEmail: 'john@acme.com',
  contactRelationship: 'Owner',
  isAdultAndAuthorized: true,
  permissionToEmail: true,
  scopePerformsAbatement: true,
  scopeServiceBuildings: true,
  scopeServiceOthers: true,
  scopeTransport: false,
  scopeSurveys: false,
  firmLegalName: 'ASBESTOS TEST ACCOUNT FOR PREVENTION',
  firmAddress: '4161 SHEILA STREET, SUITE 305 RICHMOND, BC',
  firmAccountNumber: '29615302',
  firmClassificationUnit: '2418 Service clean asbestos worksite (240202)',
  firmTradeName: 'Acme Removal',
  firmWorkersCount: 12,
  firmNopDate: '2023-01-01',
  firmNopNumber: '',
  firmCertLevel1to4: 10,
  firmCertLevel3: 2,
  ackNonTransferable: true,
  historyRefused7Years: false,
  historyRefusedAuth: false,
  historyNonCompliance: false,
  historySuspended: false,
  associates: [],
  ackOutstandingAmounts: true,
  ackCompliance: true,
  ackEnforcement: true,
  reqWorkersCert: true,
  reqCompliance: true,
  reqRecords: true,
  reqCooperation: true,
};

// Mock initial data
const INITIAL_DATA: LicenseApplication[] = [
  {
    id: 'APP-2023-001',
    companyName: 'Acme Asbestos Removal Ltd',
    applicantName: 'John Doe',
    email: 'john@acme.com',
    phone: '555-0123',
    licenseType: LicenseType.CLASS_A,
    address: '123 Industrial Way, Springfield',
    status: ApplicationStatus.SUBMITTED,
    submissionDate: '2023-10-15',
    lastUpdated: '2023-10-15',
    lastEditedBy: 'John Doe',
    safetyHistory: {
      hasViolations: false,
      yearsExperience: 10,
      insuranceExpiry: '2025-01-01'
    },
    documents: [
      { id: '1', name: 'insurance_cert.pdf', type: 'application/pdf', uploadDate: '2023-10-15' },
      { id: '2', name: 'staff_training_log.pdf', type: 'application/pdf', uploadDate: '2023-10-15' }
    ],
    wizardData: DEFAULT_MOCK_WIZARD_DATA
  },
  {
    id: 'APP-2023-002',
    companyName: 'SafeHome Renovations',
    applicantName: 'Jane Smith',
    email: 'jane@safehome.net',
    phone: '555-0987',
    licenseType: LicenseType.CLASS_B,
    address: '456 Suburbia Ln, Shelbyville',
    status: ApplicationStatus.UNDER_REVIEW,
    submissionDate: '2023-10-18',
    lastUpdated: '2023-10-20',
    lastEditedBy: 'Admin User',
    safetyHistory: {
      hasViolations: true,
      violationDetails: "Minor citation in 2021 for improper signage.",
      yearsExperience: 3,
      insuranceExpiry: '2024-06-15'
    },
    documents: [
      { id: '3', name: 'business_license.pdf', type: 'application/pdf', uploadDate: '2023-10-18' }
    ],
    wizardData: {
      ...DEFAULT_MOCK_WIZARD_DATA,
      contactFirstName: 'Jane',
      contactLastName: 'Smith',
      contactEmail: 'jane@safehome.net',
      firmTradeName: 'SafeHome',
      historyNonCompliance: true
    }
  }
];

// Mock Fact Sheets
const INITIAL_FACT_SHEETS: EmployerFactSheet[] = [
  { 
    id: 'FS-001', 
    employerLegalName: 'Acme Asbestos Removal Ltd', 
    employerTradeName: 'Acme Removal',
    employerId: '29615301',
    activeStatus: 'Active',
    accountCoverage: 'Full',
    firmType: 'Corporation',
    employerStartDate: '2015-03-12',
    classificationUnit: '721021',
    employerCuStartDate: '2015-03-12',
    overdueBalance: 0,
    currentAccountBalance: 1250.50
  },
  { 
    id: 'FS-002', 
    employerLegalName: 'SafeHome Renovations Inc.', 
    employerTradeName: 'SafeHome',
    employerId: '29615305',
    activeStatus: 'Active',
    accountCoverage: 'Partial',
    firmType: 'Sole Proprietorship',
    employerStartDate: '2020-06-01',
    classificationUnit: '721022',
    employerCuStartDate: '2020-06-01',
    overdueBalance: 500.00,
    currentAccountBalance: 850.00
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('LANDING');
  
  // Initialize from file-based storage via API
  const [applications, setApplications] = useState<LicenseApplication[]>([]);
  const [factSheets, setFactSheets] = useState<EmployerFactSheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedFactSheet, setSelectedFactSheet] = useState<EmployerFactSheet | null>(null);

  // Load applications and fact sheets from server on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const appsData = await getApplications();
        const fsData = await getFactSheets();
        
        // Extract data from the API response format
        const appsArray = Array.isArray(appsData) ? appsData.map((item: any) => item.data || item) : [];
        const fsArray = Array.isArray(fsData) ? fsData.map((item: any) => item.data || item) : [];
        
        setApplications(appsArray);
        setFactSheets(fsArray);
      } catch (error) {
        console.error('Failed to load data from server:', error);
        // Fallback to empty arrays if loading fails
        setApplications([]);
        setFactSheets([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleCreateApplication = (app: LicenseApplication) => {
    setApplications(prev => [app, ...prev]);
    // Persist to server
    createApplication(app.id, app).catch(error => {
      console.error('Failed to save application to server:', error);
      alert('Failed to save application. Please try again.');
    });
    handleNavigate('EMPLOYER_DASHBOARD');
  };

  const handleUpdateApplication = (updatedApp: LicenseApplication) => {
    const appWithTimestamp = {
      ...updatedApp,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setApplications(prev => prev.map(a => a.id === updatedApp.id ? appWithTimestamp : a));
    // Persist to server
    updateApplication(updatedApp.id, appWithTimestamp).catch(error => {
      console.error('Failed to update application on server:', error);
      alert('Failed to update application. Please try again.');
    });
  };

  const handleSelectAppForReview = (id: string) => {
    setSelectedAppId(id);
    handleNavigate('ADMIN_REVIEW');
  };

  const handleEmployerViewApp = (app: LicenseApplication) => {
    setSelectedAppId(app.id);
    handleNavigate('EMPLOYER_APP_DETAIL');
  };

  const handleCreateFactSheet = (data: Omit<EmployerFactSheet, 'id'>) => {
    const newSheet: EmployerFactSheet = {
      id: `FS-${Date.now()}`,
      ...data
    };
    setFactSheets(prev => [...prev, newSheet]);
    // Persist to server
    createFactSheet(newSheet.id, newSheet).catch(error => {
      console.error('Failed to save fact sheet to server:', error);
      alert('Failed to save fact sheet. Please try again.');
    });
    handleNavigate('ADMIN_FACT_SHEETS');
  };

  const handleDeleteFactSheet = async (id: string) => {
    try {
      await deleteFactSheet(id);
      setFactSheets((prev) => prev.filter((sheet) => sheet.id !== id));
      alert('Fact sheet deleted successfully!');
    } catch (error) {
      console.error('Failed to delete fact sheet:', error);
      alert('Failed to delete fact sheet. Please try again.');
    }
  };

  const handleDataImport = async (data: { applications: LicenseApplication[], factSheets: EmployerFactSheet[] }) => {
    try {
      // Save all applications to server
      if (data.applications) {
        for (const app of data.applications) {
          await createApplication(app.id, app);
        }
        setApplications(data.applications);
      }
      // Save all fact sheets to server
      if (data.factSheets) {
        for (const fs of data.factSheets) {
          await createFactSheet(fs.id, fs);
        }
        setFactSheets(data.factSheets);
      }
      alert('Database successfully restored from file and persisted to server.');
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data. Please try again.');
    }
  };

  // Add a handler for viewing a fact sheet
  const handleViewFactSheet = (factSheet: EmployerFactSheet) => {
    setSelectedFactSheet(factSheet);
    handleNavigate('ADMIN_FACT_SHEET_VIEW');
  };

  const handleEditFactSheet = (factSheet: EmployerFactSheet) => {
    setSelectedFactSheet(factSheet);
    handleNavigate('ADMIN_FACT_SHEET_EDIT');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'LANDING':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'EMPLOYER_DASHBOARD':
        return <EmployerDashboard 
          applications={applications} 
          onNewClick={() => handleNavigate('EMPLOYER_NEW_FORM')} 
          onLogout={() => handleNavigate('LANDING')}
          onViewClick={handleEmployerViewApp}
        />;
      case 'EMPLOYER_NEW_FORM':
        return <NewApplicationForm 
          onSubmit={handleCreateApplication} 
          onCancel={() => handleNavigate('EMPLOYER_DASHBOARD')}
          factSheets={factSheets}
        />;
      case 'EMPLOYER_APP_DETAIL':
        const employerApp = applications.find(a => a.id === selectedAppId);
        if (!employerApp) return <div>Application not found</div>;
        return <ApplicationDetail 
          application={employerApp} 
          onBack={() => handleNavigate('EMPLOYER_DASHBOARD')} 
        />;
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard 
          applications={applications}
          factSheets={factSheets}
          onReviewClick={handleSelectAppForReview}
          onLogout={() => handleNavigate('LANDING')}
          onDataImport={handleDataImport}
        />;
      case 'ADMIN_REVIEW':
        const appToReview = applications.find(a => a.id === selectedAppId);
        if (!appToReview) return <div>Application not found</div>;
        return <ApplicationReview 
          application={appToReview} 
          factSheets={factSheets}
          onUpdate={handleUpdateApplication}
          onBack={() => handleNavigate('ADMIN_DASHBOARD')}
        />;
      case 'ADMIN_FACT_SHEETS':
        return <FactSheetList 
          factSheets={factSheets}
          onNewClick={() => handleNavigate('ADMIN_FACT_SHEET_NEW')}
          onBack={() => handleNavigate('ADMIN_DASHBOARD')}
          onDelete={handleDeleteFactSheet}
          onView={handleViewFactSheet}
          onEdit={handleEditFactSheet}
        />;
      case 'ADMIN_FACT_SHEET_NEW':
        return <FactSheetForm 
          onSubmit={handleCreateFactSheet}
          onCancel={() => handleNavigate('ADMIN_FACT_SHEETS')}
        />;
      case 'ADMIN_FACT_SHEET_EDIT':
        if (!selectedFactSheet) return <div>Fact sheet not found</div>;
        return (
          <FactSheetForm
            initialData={selectedFactSheet}
            onSubmit={async (data) => {
              // Update existing fact sheet
              const updated = data as EmployerFactSheet;
              try {
                await updateFactSheet(updated.id, updated);
                setFactSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
                handleNavigate('ADMIN_FACT_SHEETS');
              } catch (err) {
                console.error('Failed to update fact sheet:', err);
                alert('Failed to update fact sheet.');
              }
            }}
            onCancel={() => handleNavigate('ADMIN_FACT_SHEETS')}
          />
        );
      // Add a case for viewing a single fact sheet
      case 'ADMIN_FACT_SHEET_VIEW':
        if (!selectedFactSheet) return <div>Fact sheet not found</div>;
        return (
          <FactSheetView 
            factSheet={selectedFactSheet} 
            onBack={() => handleNavigate('ADMIN_FACT_SHEETS')} 
          />
        );
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigate('LANDING')}>
            <ShieldCheck className="h-8 w-8 text-brand-500" />
            <span className="text-xl font-bold tracking-tight">AsbestosGuard</span>
          </div>
          <div className="text-sm text-slate-400">
            Licensing & Compliance Portal
          </div>
        </div>
      </header>
      <main className="flex-grow">
        {renderContent()}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <div className="mb-4">
             &copy; {new Date().getFullYear()} AsbestosGuard Regulatory Authority. All rights reserved.
          </div>
          <div className="border-t border-slate-800 pt-4">
            <button 
              onClick={() => handleNavigate('ADMIN_FACT_SHEETS')}
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
            >
              Manage Fact Sheets (Test)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
