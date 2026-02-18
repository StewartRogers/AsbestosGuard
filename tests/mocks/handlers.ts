import { http, HttpResponse } from 'msw';
import {
  mockAdminUser,
  mockEmployerUser,
  mockApplication,
  mockFactSheet,
  mockAnalysisResult,
} from './fixtures';

const API_BASE_URL = 'http://localhost:5000/api';

// Authentication handlers
export const authHandlers = [
  // Admin login
  http.post(`${API_BASE_URL}/auth/login/admin`, async ({ request }) => {
    const body = await request.json() as any;
    const { username, password } = body;

    // Use environment variables for test credentials
    const testAdminUsername = process.env.ADMIN_USERNAME || 'admin';
    const testAdminPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';

    if (username === testAdminUsername && password === testAdminPassword) {
      return HttpResponse.json({
        user: mockAdminUser,
        message: 'Login successful',
      });
    }

    return HttpResponse.json(
      {
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid credentials',
        },
      },
      { status: 401 }
    );
  }),

  // Employer login
  http.post(`${API_BASE_URL}/auth/login/employer`, async ({ request }) => {
    const body = await request.json() as any;
    const { email, password } = body;

    // Use environment variables for test credentials
    const testEmployerEmail = process.env.TEST_EMPLOYER_EMAIL || 'test@example.com';
    const testEmployerPassword = process.env.TEST_EMPLOYER_PASSWORD || 'password123';

    if (email === testEmployerEmail && password === testEmployerPassword) {
      return HttpResponse.json({
        user: mockEmployerUser,
        message: 'Login successful',
      });
    }

    return HttpResponse.json(
      {
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid credentials',
        },
      },
      { status: 401 }
    );
  }),

  // Logout
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logout successful' });
  }),

  // Get current user
  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json({ user: mockAdminUser });
  }),

  // Refresh token
  http.post(`${API_BASE_URL}/auth/refresh`, () => {
    return HttpResponse.json({ message: 'Token refreshed' });
  }),
];

// Application handlers
export const applicationHandlers = [
  // Get all applications
  http.get(`${API_BASE_URL}/applications`, () => {
    return HttpResponse.json([mockApplication]);
  }),

  // Create application
  http.post(`${API_BASE_URL}/applications`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      message: 'Application created successfully',
      filename: body.filename,
    });
  }),

  // Update application
  http.put(`${API_BASE_URL}/applications/:filename`, async ({ request, params }) => {
    return HttpResponse.json({
      message: 'Application updated successfully',
      filename: params.filename,
    });
  }),

  // Delete application
  http.delete(`${API_BASE_URL}/applications/:filename`, ({ params }) => {
    return HttpResponse.json({
      message: 'Application deleted successfully',
      filename: params.filename,
    });
  }),
];

// Fact sheet handlers
export const factSheetHandlers = [
  // Get all fact sheets
  http.get(`${API_BASE_URL}/fact-sheets`, () => {
    return HttpResponse.json([mockFactSheet]);
  }),

  // Create fact sheet
  http.post(`${API_BASE_URL}/fact-sheets`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      message: 'Fact sheet created successfully',
      filename: body.filename,
    });
  }),

  // Update fact sheet
  http.put(`${API_BASE_URL}/fact-sheets/:filename`, async ({ request, params }) => {
    return HttpResponse.json({
      message: 'Fact sheet updated successfully',
      filename: params.filename,
    });
  }),

  // Delete fact sheet
  http.delete(`${API_BASE_URL}/fact-sheets/:filename`, ({ params }) => {
    return HttpResponse.json({
      message: 'Fact sheet deleted successfully',
      filename: params.filename,
    });
  }),
];

// Analysis handlers
export const analysisHandlers = [
  // Get all analyses
  http.get(`${API_BASE_URL}/analysis`, () => {
    return HttpResponse.json([mockAnalysisResult]);
  }),

  // Get specific analysis
  http.get(`${API_BASE_URL}/analysis/:filename`, () => {
    return HttpResponse.json(mockAnalysisResult);
  }),

  // Save analysis
  http.post(`${API_BASE_URL}/analysis`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      message: 'Analysis saved successfully',
      filename: body.filename,
    });
  }),

  // Delete analysis
  http.delete(`${API_BASE_URL}/analysis/:filename`, ({ params }) => {
    return HttpResponse.json({
      message: 'Analysis deleted successfully',
      filename: params.filename,
    });
  }),
];

// Gemini analysis handlers
export const geminiHandlers = [
  // Analyze application with Gemini
  http.post('http://localhost:5000/__api/gemini/analyze', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(mockAnalysisResult);
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = [
  // Unauthorized access
  http.get(`${API_BASE_URL}/applications`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'No authentication token provided',
        },
      },
      { status: 401 }
    );
  }),

  // Validation error
  http.post(`${API_BASE_URL}/applications`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid filename: path traversal detected',
        },
      },
      { status: 400 }
    );
  }),

  // Rate limit error
  http.post(`${API_BASE_URL}/auth/login/admin`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_ERROR',
          message: 'Too many login attempts, please try again later',
        },
      },
      { status: 429 }
    );
  }),

  // Server error
  http.get(`${API_BASE_URL}/fact-sheets`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }),
];

// Default handlers (success cases)
export const handlers = [
  ...authHandlers,
  ...applicationHandlers,
  ...factSheetHandlers,
  ...analysisHandlers,
  ...geminiHandlers,
];
