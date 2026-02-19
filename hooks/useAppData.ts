import { useState, useEffect, useCallback } from 'react';
import { LicenseApplication, EmployerFactSheet, ViewState } from '../types';
import {
  getApplications, createApplication, updateApplication,
  getFactSheets, createFactSheet, updateFactSheet, deleteFactSheet,
} from '../services/apiService';

/**
 * Return type for the {@link useAppData} hook.
 */
interface UseAppDataReturn {
  /** All licence applications fetched from the server. */
  applications: LicenseApplication[];
  /** All employer fact sheets fetched from the server. */
  factSheets: EmployerFactSheet[];
  /** True while the initial data load is in progress. */
  isLoading: boolean;
  /** Optimistically prepend a new application and persist it to the server. */
  handleCreateApplication: (app: LicenseApplication) => void;
  /** Optimistically update an application (stamps `lastUpdated`) and persist it. */
  handleUpdateApplication: (updatedApp: LicenseApplication) => void;
  /** Create a fact sheet, assign a generated ID, and navigate to the fact sheet list. */
  handleCreateFactSheet: (data: Omit<EmployerFactSheet, 'id'>) => void;
  /** Persist an updated fact sheet and sync local state. */
  handleUpdateFactSheet: (updated: EmployerFactSheet) => Promise<void>;
  /** Delete a fact sheet by ID and remove it from local state. */
  handleDeleteFactSheet: (id: string) => Promise<void>;
  /** Bulk-import applications and fact sheets, persisting each item to the server. */
  handleDataImport: (data: { applications: LicenseApplication[]; factSheets: EmployerFactSheet[] }) => Promise<void>;
}

/**
 * Loads and manages applications and fact sheets for the authenticated session.
 *
 * Data is fetched from the API whenever `isAuthenticated` transitions to `true`.
 * A 401 response triggers `onAuthExpired` so the parent can reset auth state.
 * All write operations update local state optimistically before (or alongside)
 * the server call, keeping the UI responsive.
 *
 * @param isAuthenticated - Whether a valid session currently exists.
 * @param onNavigate - Callback used to change the active view after mutations.
 * @param onAuthExpired - Called when the API returns 401, signalling a stale token.
 * @returns Application and fact sheet state plus CRUD handlers.
 */
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
