import React, { useState, useCallback } from 'react';
import { ViewState, LicenseApplication, EmployerFactSheet } from './types';
import LandingPage from './pages/Landing';
import EmployerLogin from './pages/Employer/EmployerLogin';
import EmployerDashboard from './pages/Employer/EmployerDashboard';
import NewApplicationForm from './pages/Employer/NewApplicationForm';
import ApplicationDetail from './pages/Employer/ApplicationDetail';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ApplicationReview from './pages/Admin/ApplicationReview';
import FactSheetList from './pages/Admin/FactSheetList';
import FactSheetForm from './pages/Admin/FactSheetForm';
import FactSheetView from './pages/Admin/FactSheetView';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('EMPLOYER_LOGIN');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedFactSheet, setSelectedFactSheet] = useState<EmployerFactSheet | null>(null);

  const handleNavigate = useCallback((view: ViewState) => {
    console.log('[NAV]', view, new Error().stack?.split('\n').slice(1, 4).join(' | '));
    setCurrentView(view);
    window.scrollTo(0, 0);
  }, []);

  const currentViewRef = React.useRef<ViewState>(currentView);
  currentViewRef.current = currentView;

  const auth = useAuth(handleNavigate, currentViewRef);

  const data = useAppData(
    auth.isEmployerAuthenticated || auth.isAdminAuthenticated,
    handleNavigate,
    () => {
      auth.resetAuth();
      setCurrentView('EMPLOYER_LOGIN');
    },
  );

  const handleSelectAppForReview = (id: string) => {
    setSelectedAppId(id);
    handleNavigate('ADMIN_REVIEW');
  };

  const handleEmployerViewApp = (app: LicenseApplication) => {
    setSelectedAppId(app.id);
    handleNavigate('EMPLOYER_APP_DETAIL');
  };

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
      case 'EMPLOYER_LOGIN':
        return <EmployerLogin onLogin={auth.handleEmployerLogin} />;
      case 'EMPLOYER_DASHBOARD':
        return (
          <EmployerDashboard
            applications={data.applications}
            onNewClick={() => handleNavigate('EMPLOYER_NEW_FORM')}
            onLogout={auth.handleEmployerLogout}
            onViewClick={handleEmployerViewApp}
          />
        );
      case 'EMPLOYER_NEW_FORM':
        return (
          <NewApplicationForm
            onSubmit={data.handleCreateApplication}
            onCancel={() => handleNavigate('EMPLOYER_DASHBOARD')}
            factSheets={data.factSheets}
          />
        );
      case 'EMPLOYER_APP_DETAIL': {
        const employerApp = data.applications.find(a => a.id === selectedAppId);
        if (!employerApp) return <div>Application not found</div>;
        return (
          <ApplicationDetail
            application={employerApp}
            onBack={() => handleNavigate('EMPLOYER_DASHBOARD')}
          />
        );
      }
      case 'ADMIN_LOGIN':
        return (
          <AdminLogin
            onLogin={auth.handleAdminLogin}
            onCancel={() => handleNavigate('EMPLOYER_LOGIN')}
          />
        );
      case 'ADMIN_DASHBOARD':
        if (!auth.isAdminAuthenticated) return <AdminLogin onLogin={auth.handleAdminLogin} onCancel={() => handleNavigate('EMPLOYER_LOGIN')} />;
        return (
          <AdminDashboard
            applications={data.applications}
            factSheets={data.factSheets}
            onReviewClick={handleSelectAppForReview}
            onLogout={auth.handleAdminLogout}
            onDataImport={data.handleDataImport}
          />
        );
      case 'ADMIN_REVIEW': {
        if (!auth.isAdminAuthenticated) return <AdminLogin onLogin={auth.handleAdminLogin} onCancel={() => handleNavigate('EMPLOYER_LOGIN')} />;
        const appToReview = data.applications.find(a => a.id === selectedAppId);
        if (!appToReview) return <div>Application not found</div>;
        return (
          <ApplicationReview
            application={appToReview}
            factSheets={data.factSheets}
            onUpdate={data.handleUpdateApplication}
            onBack={() => handleNavigate('ADMIN_DASHBOARD')}
          />
        );
      }
      case 'ADMIN_FACT_SHEETS':
        if (!auth.isAdminAuthenticated) return <AdminLogin onLogin={auth.handleAdminLogin} onCancel={() => handleNavigate('EMPLOYER_LOGIN')} />;
        return (
          <FactSheetList
            factSheets={data.factSheets}
            onNewClick={() => handleNavigate('ADMIN_FACT_SHEET_NEW')}
            onBack={() => handleNavigate('ADMIN_DASHBOARD')}
            onDelete={data.handleDeleteFactSheet}
            onView={handleViewFactSheet}
            onEdit={handleEditFactSheet}
          />
        );
      case 'ADMIN_FACT_SHEET_NEW':
        if (!auth.isAdminAuthenticated) return <AdminLogin onLogin={auth.handleAdminLogin} onCancel={() => handleNavigate('EMPLOYER_LOGIN')} />;
        return (
          <FactSheetForm
            onSubmit={data.handleCreateFactSheet}
            onCancel={() => handleNavigate('ADMIN_FACT_SHEETS')}
          />
        );
      case 'ADMIN_FACT_SHEET_EDIT':
        if (!auth.isAdminAuthenticated) return <AdminLogin onLogin={auth.handleAdminLogin} onCancel={() => handleNavigate('EMPLOYER_LOGIN')} />;
        if (!selectedFactSheet) return <div>Fact sheet not found</div>;
        return (
          <FactSheetForm
            initialData={selectedFactSheet}
            onSubmit={async (formData) => {
              const updated = formData as EmployerFactSheet;
              try {
                await data.handleUpdateFactSheet(updated);
                handleNavigate('ADMIN_FACT_SHEETS');
              } catch {
                alert('Failed to update fact sheet.');
              }
            }}
            onCancel={() => handleNavigate('ADMIN_FACT_SHEETS')}
          />
        );
      case 'ADMIN_FACT_SHEET_VIEW':
        if (!auth.isAdminAuthenticated) return <AdminLogin onLogin={auth.handleAdminLogin} onCancel={() => handleNavigate('EMPLOYER_LOGIN')} />;
        if (!selectedFactSheet) return <div>Fact sheet not found</div>;
        return (
          <FactSheetView
            factSheet={selectedFactSheet}
            onBack={() => handleNavigate('ADMIN_FACT_SHEETS')}
          />
        );
      default:
        return <EmployerLogin onLogin={auth.handleEmployerLogin} />;
    }
  };

  const handleLogoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      auth.isEmployerAuthenticated ? handleNavigate('EMPLOYER_DASHBOARD') : handleNavigate('EMPLOYER_LOGIN');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="AsbestosGuard home"
            onClick={() => auth.isEmployerAuthenticated ? handleNavigate('EMPLOYER_DASHBOARD') : handleNavigate('EMPLOYER_LOGIN')}
            onKeyDown={handleLogoKeyDown}
          >
            <ShieldCheck className="h-8 w-8 text-brand-500" aria-hidden="true" />
            <span className="text-xl font-bold tracking-tight">AsbestosGuard</span>
          </div>
          <nav aria-label="Site navigation" className="flex items-center space-x-6">
            {auth.isEmployerAuthenticated && (
              <span className="text-sm text-blue-300">{auth.employerEmail}</span>
            )}
            {auth.isAdminAuthenticated && (
              <span className="text-sm text-brand-400">Admin Mode</span>
            )}
            <div className="text-sm text-slate-400">
              Licensing &amp; Compliance Portal
            </div>
            {!auth.isAdminAuthenticated && (
              <button
                onClick={() => handleNavigate('ADMIN_LOGIN')}
                className="text-sm text-slate-300 hover:text-white transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
              >
                Admin Login
              </button>
            )}
          </nav>
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
              className="text-slate-400 hover:text-slate-200 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
            >
              Manage Fact Sheets (Test)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
