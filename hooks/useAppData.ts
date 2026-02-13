import { useState, useEffect, useCallback } from 'react';
import { LicenseApplication, EmployerFactSheet, ViewState } from '../types';
import {
  getApplications, createApplication, updateApplication,
  getFactSheets, createFactSheet, updateFactSheet, deleteFactSheet,
} from '../services/apiService';

interface UseAppDataReturn {
  applications: LicenseApplication[];
  factSheets: EmployerFactSheet[];
  isLoading: boolean;
  handleCreateApplication: (app: LicenseApplication) => void;
  handleUpdateApplication: (updatedApp: LicenseApplication) => void;
  handleCreateFactSheet: (data: Omit<EmployerFactSheet, 'id'>) => void;
  handleUpdateFactSheet: (updated: EmployerFactSheet) => Promise<void>;
  handleDeleteFactSheet: (id: string) => Promise<void>;
  handleDataImport: (data: { applications: LicenseApplication[]; factSheets: EmployerFactSheet[] }) => Promise<void>;
}

export function useAppData(
  isAuthenticated: boolean,
  onNavigate: (view: ViewState) => void,
  onAuthExpired: () => void,
): UseAppDataReturn {
  const [applications, setApplications] = useState<LicenseApplication[]>([]);
  const [factSheets, setFactSheets] = useState<EmployerFactSheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from server when authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        const appsData = await getApplications();
        const fsData = await getFactSheets();

        const appsArray = Array.isArray(appsData) ? appsData.map((item: any) => item.data || item) : [];
        const fsArray = Array.isArray(fsData) ? fsData.map((item: any) => item.data || item) : [];

        setApplications(appsArray);
        setFactSheets(fsArray);
      } catch (error) {
        if ((error as any)?.response?.status === 401) {
          onAuthExpired();
        }
        setApplications([]);
        setFactSheets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  const handleCreateApplication = useCallback((app: LicenseApplication) => {
    setApplications(prev => [app, ...prev]);
    createApplication(app.id, app).catch(() => {
      alert('Failed to save application. Please try again.');
    });
    onNavigate('EMPLOYER_DASHBOARD');
  }, [onNavigate]);

  const handleUpdateApplication = useCallback((updatedApp: LicenseApplication) => {
    const appWithTimestamp = {
      ...updatedApp,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setApplications(prev => prev.map(a => a.id === updatedApp.id ? appWithTimestamp : a));
    updateApplication(updatedApp.id, appWithTimestamp).catch(() => {
      alert('Failed to update application. Please try again.');
    });
  }, []);

  const handleCreateFactSheet = useCallback((data: Omit<EmployerFactSheet, 'id'>) => {
    const newSheet: EmployerFactSheet = {
      id: `FS-${Date.now()}`,
      ...data,
    };
    setFactSheets(prev => [...prev, newSheet]);
    createFactSheet(newSheet.id, newSheet).catch(() => {
      alert('Failed to save fact sheet. Please try again.');
    });
    onNavigate('ADMIN_FACT_SHEETS');
  }, [onNavigate]);

  const handleUpdateFactSheet = useCallback(async (updated: EmployerFactSheet) => {
    await updateFactSheet(updated.id, updated);
    setFactSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const handleDeleteFactSheet = useCallback(async (id: string) => {
    await deleteFactSheet(id);
    setFactSheets(prev => prev.filter(sheet => sheet.id !== id));
    alert('Fact sheet deleted successfully!');
  }, []);

  const handleDataImport = useCallback(async (data: { applications: LicenseApplication[]; factSheets: EmployerFactSheet[] }) => {
    if (data.applications) {
      for (const app of data.applications) {
        await createApplication(app.id, app);
      }
      setApplications(data.applications);
    }
    if (data.factSheets) {
      for (const fs of data.factSheets) {
        await createFactSheet(fs.id, fs);
      }
      setFactSheets(data.factSheets);
    }
    alert('Database successfully restored from file and persisted to server.');
  }, []);

  return {
    applications,
    factSheets,
    isLoading,
    handleCreateApplication,
    handleUpdateApplication,
    handleCreateFactSheet,
    handleUpdateFactSheet,
    handleDeleteFactSheet,
    handleDataImport,
  };
}
