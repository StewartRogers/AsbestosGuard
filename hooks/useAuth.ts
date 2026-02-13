import { useState, useEffect, useCallback } from 'react';
import { ViewState } from '../types';
import { loginAdmin, loginEmployer, logout, getCurrentUser } from '../services/apiService';

interface UseAuthReturn {
  isEmployerAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  employerEmail: string;
  handleEmployerLogin: (email: string, password: string) => Promise<void>;
  handleEmployerLogout: () => Promise<void>;
  handleAdminLogin: (username: string, password: string) => Promise<void>;
  handleAdminLogout: () => Promise<void>;
  resetAuth: () => void;
}

export function useAuth(onNavigate: (view: ViewState) => void): UseAuthReturn {
  const [isEmployerAuthenticated, setIsEmployerAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [employerEmail, setEmployerEmail] = useState('');

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getCurrentUser();
        if (response.user) {
          if (response.user.role === 'admin') {
            setIsAdminAuthenticated(true);
            onNavigate('ADMIN_DASHBOARD');
          } else if (response.user.role === 'employer') {
            setIsEmployerAuthenticated(true);
            setEmployerEmail(response.user.email || '');
            onNavigate('EMPLOYER_DASHBOARD');
          }
        }
      } catch {
        // Not authenticated, stay on login page
      }
    };
    checkAuth();
  }, []);

  const handleEmployerLogin = useCallback(async (email: string, password: string) => {
    const response = await loginEmployer(email, password);
    setIsEmployerAuthenticated(true);
    setEmployerEmail(response.user.email);
    onNavigate('EMPLOYER_DASHBOARD');
  }, [onNavigate]);

  const handleEmployerLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Continue with local logout even if server call fails
    } finally {
      setIsEmployerAuthenticated(false);
      setEmployerEmail('');
      onNavigate('EMPLOYER_LOGIN');
    }
  }, [onNavigate]);

  const handleAdminLogin = useCallback(async (username: string, password: string) => {
    await loginAdmin(username, password);
    setIsAdminAuthenticated(true);
    onNavigate('ADMIN_DASHBOARD');
  }, [onNavigate]);

  const handleAdminLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Continue with local logout even if server call fails
    } finally {
      setIsAdminAuthenticated(false);
      onNavigate('EMPLOYER_LOGIN');
    }
  }, [onNavigate]);

  const resetAuth = useCallback(() => {
    setIsEmployerAuthenticated(false);
    setIsAdminAuthenticated(false);
    setEmployerEmail('');
  }, []);

  return {
    isEmployerAuthenticated,
    isAdminAuthenticated,
    employerEmail,
    handleEmployerLogin,
    handleEmployerLogout,
    handleAdminLogin,
    handleAdminLogout,
    resetAuth,
  };
}
