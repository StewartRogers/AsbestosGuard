import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployerLogin from '../../pages/Employer/EmployerLogin';

describe('EmployerLogin Component', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
  });

  describe('rendering', () => {
    it('should render the login form', () => {
      render(<EmployerLogin onLogin={mockOnLogin} />);

      expect(screen.getByText('AsbestosGuard')).toBeInTheDocument();
      expect(screen.getByText('Employer License Portal')).toBeInTheDocument();
      expect(screen.getByLabelText(/company email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render security notice', () => {
      render(<EmployerLogin onLogin={mockOnLogin} />);

      expect(screen.getByText('Secure server-side authentication enabled')).toBeInTheDocument();
    });

    it('should have correct input types', () => {
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have autocomplete attributes', () => {
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have placeholder text', () => {
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('placeholder', 'your.company@example.com');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });
  });

  describe('form validation', () => {
    it('should show error when submitting empty form', async () => {
      const user = userEvent.setup();
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter both email and password')).toBeInTheDocument();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter both email and password')).toBeInTheDocument();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter both email and password')).toBeInTheDocument();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should accept valid email formats', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockResolvedValue(undefined);
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('form submission', () => {
    it('should call onLogin with correct credentials', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockResolvedValue(undefined);
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockOnLogin.mockReturnValue(loginPromise);

      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show loading state
      expect(await screen.findByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve login
      resolveLogin!();

      // Loading state should disappear
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });

    it('should disable inputs during loading', async () => {
      const user = userEvent.setup();
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockOnLogin.mockReturnValue(loginPromise);

      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Inputs should be disabled
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });

      resolveLogin!();

      // Inputs should be enabled again
      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should display server error message', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      mockOnLogin.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage,
            },
          },
        },
      });

      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    });

    it('should display generic error when server error is malformed', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockRejectedValue(new Error('Network error'));

      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText('Login failed')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('should submit form with Enter key', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockResolvedValue(undefined);
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('email validation edge cases', () => {
    it('should accept email with subdomain', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockResolvedValue(undefined);
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@mail.example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });

    it('should accept email with plus sign', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockResolvedValue(undefined);
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test+alias@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });

    it('should reject email without @ symbol', async () => {
      const user = userEvent.setup();
      render(<EmployerLogin onLogin={mockOnLogin} />);

      const emailInput = screen.getByLabelText(/company email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'testexample.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });
});
