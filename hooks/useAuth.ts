import { useState, useEffect, useCallback } from 'react';
import { ViewState } from '../types';
import { loginAdmin, loginEmployer, logout, getCurrentUser } from '../services/apiService';

/**
 * Return type for the {@link useAuth} hook.
 */
interface UseAuthReturn {
  /** Whether the current session belongs to an authenticated employer. */
  isEmployerAuthenticated: boolean;
  /** Whether the current session belongs to an authenticated admin. */
  isAdminAuthenticated: boolean;
  /** Email address of the currently authenticated employer, or empty string. */
  employerEmail: string;
  /** Log in as an employer and navigate to the employer dashboard. */
  handleEmployerLogin: (email: string, password: string) => Promise<void>;
  /** Log out the current employer and navigate to the employer login page. */
  handleEmployerLogout: () => Promise<void>;
  /** Log in as an admin and navigate to the admin dashboard. */
  handleAdminLogin: (username: string, password: string) => Promise<void>;
  /** Log out the current admin and navigate to the employer login page. */
  handleAdminLogout: () => Promise<void>;
  /** Reset all auth state to unauthenticated without a server call (e.g. on 401). */
  resetAuth: () => void;
}

/**
 * Manages authentication state for the entire application.
 *
 * On mount it calls `GET /api/auth/me` to restore any existing session from the
 * HTTP-only cookie, then redirects to the appropriate dashboard. Login and
 * logout functions update both local state and the server session. A failed
 * server logout still clears local state so the UI is never stuck.
 *
 * @param onNavigate - Callback used to change the active view.
 * @returns Auth state and handler functions.
 */
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
