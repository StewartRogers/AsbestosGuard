// Test data fixtures for AsbestosGuard tests

import type { LicenseApplication, EmployerFactSheet, AIAnalysisResult } from '../../types';

// Mock Admin User
export const mockAdminUser = {
  userId: 'admin',
  username: 'admin',
  role: 'admin' as const,
};

// Mock Employer User
export const mockEmployerUser = {
  userId: 'emp-123',
  email: 'test@example.com',
  role: 'employer' as const,
};

// Mock JWT Tokens
export const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.test';
export const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.refresh';

// Mock License Application
export const mockApplication: LicenseApplication = {
  companyName: 'Test Asbestos Company',
  contactPerson: 'John Doe',
  address: '123 Test Street',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  phoneNumber: '555-1234',
  email: 'test@example.com',
  licenseType: 'Contractor',
  workDescription: 'Asbestos removal and abatement services',
  projectLocations: ['Test Site 1', 'Test Site 2'],
  insuranceProvider: 'Test Insurance Co',
  insurancePolicyNumber: 'INS-12345',
  insuranceCoverage: '1000000',
  previousViolations: 'none',
  certifications: ['EPA Certified', 'State Licensed'],
  equipmentList: ['HEPA Vacuums', 'Personal Protective Equipment'],
  safetyPlan: 'We follow all EPA and OSHA guidelines for asbestos removal.',
  submittedDate: new Date().toISOString(),
};

// Mock Employer Fact Sheet
export const mockFactSheet: EmployerFactSheet = {
  companyName: 'Test Asbestos Company',
  address: '123 Test Street, Test City, TS 12345',
  contactPerson: 'John Doe',
  phoneNumber: '555-1234',
  email: 'test@example.com',
  licenseNumber: 'LIC-12345',
  licenseType: 'Contractor',
  licenseStatus: 'Active',
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  employeeCount: 25,
  projectTypes: ['Commercial', 'Residential'],
  certifications: ['EPA Certified', 'State Licensed'],
  insuranceInfo: {
    provider: 'Test Insurance Co',
    policyNumber: 'INS-12345',
    coverage: '1000000',
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  complianceHistory: {
    violations: [],
    inspections: [],
    compliant: true,
  },
};

// Mock AI Analysis Result
export const mockAnalysisResult: AIAnalysisResult = {
  applicationId: 'test-app-123',
  analyzedAt: new Date().toISOString(),
  status: 'success',
  factSheetAnalysis: {
    matchFound: true,
    matchedFactSheet: 'test-company',
    companyName: 'Test Asbestos Company',
    licenseStatus: 'Active',
    confidence: 'high',
    discrepancies: [],
  },
  policyAnalysis: {
    violations: [],
    concerns: [],
    overallRisk: 'low',
    recommendation: 'approve',
  },
  webAnalysis: {
    websiteFound: true,
    websiteUrl: 'https://www.testcompany.com',
    businessVerified: true,
    reputationScore: 85,
    findings: ['Active business website', 'Positive customer reviews'],
  },
  summary: {
    recommendation: 'approve',
    riskLevel: 'low',
    keyFindings: ['No policy violations detected', 'Company verified and in good standing'],
    requiredActions: [],
  },
};

// Mock Analysis Result - Failed
export const mockFailedAnalysisResult: AIAnalysisResult = {
  applicationId: 'test-app-failed',
  analyzedAt: new Date().toISOString(),
  status: 'error',
  error: 'Failed to analyze application due to API error',
  factSheetAnalysis: {
    matchFound: false,
    confidence: 'low',
    discrepancies: [],
  },
  policyAnalysis: {
    violations: [],
    concerns: [],
    overallRisk: 'unknown',
    recommendation: 'manual_review',
  },
  webAnalysis: {
    websiteFound: false,
    businessVerified: false,
    reputationScore: 0,
    findings: [],
  },
  summary: {
    recommendation: 'manual_review',
    riskLevel: 'unknown',
    keyFindings: ['Analysis failed'],
    requiredActions: ['Manual review required'],
  },
};

// Mock Analysis Result - High Risk
export const mockHighRiskAnalysisResult: AIAnalysisResult = {
  applicationId: 'test-app-high-risk',
  analyzedAt: new Date().toISOString(),
  status: 'success',
  factSheetAnalysis: {
    matchFound: true,
    matchedFactSheet: 'risky-company',
    companyName: 'Risky Asbestos Company',
    licenseStatus: 'Suspended',
    confidence: 'high',
    discrepancies: ['License status discrepancy', 'Address mismatch'],
  },
  policyAnalysis: {
    violations: [
      'Previous safety violations on record',
      'Expired insurance coverage',
    ],
    concerns: ['Inadequate safety plan', 'Missing certifications'],
    overallRisk: 'high',
    recommendation: 'deny',
  },
  webAnalysis: {
    websiteFound: true,
    websiteUrl: 'https://www.riskycompany.com',
    businessVerified: false,
    reputationScore: 35,
    findings: ['Negative customer reviews', 'BBB complaints'],
  },
  summary: {
    recommendation: 'deny',
    riskLevel: 'high',
    keyFindings: [
      'Suspended license',
      'Expired insurance',
      'Previous safety violations',
    ],
    requiredActions: [
      'Reinstate license',
      'Renew insurance coverage',
      'Address safety violations',
    ],
  },
};

// Helper function to create custom applications
export const createMockApplication = (
  overrides: Partial<LicenseApplication> = {}
): LicenseApplication => ({
  ...mockApplication,
  ...overrides,
});

// Helper function to create custom fact sheets
export const createMockFactSheet = (
  overrides: Partial<EmployerFactSheet> = {}
): EmployerFactSheet => ({
  ...mockFactSheet,
  ...overrides,
});

// Helper function to create custom analysis results
export const createMockAnalysisResult = (
  overrides: Partial<AIAnalysisResult> = {}
): AIAnalysisResult => ({
  ...mockAnalysisResult,
  ...overrides,
});
