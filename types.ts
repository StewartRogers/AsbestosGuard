

export enum ApplicationStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  NEEDS_INFO = 'Needs Information'
}

export enum LicenseType {
  CLASS_A = 'Class A (Friable Asbestos Removal)',
  CLASS_B = 'Class B (Non-Friable Asbestos Removal)',
  SUPERVISOR = 'Asbestos Assessor/Supervisor'
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
}

export interface SafetyHistory {
  hasViolations: boolean;
  violationDetails?: string;
  yearsExperience: number;
  insuranceExpiry: string;
}

export interface Associate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName?: string;
  businessAddress?: string;
  relationship: string;
  // History/Legal Declarations for this associate
  history?: {
    cancelledOrRefused: boolean;
    enforcementAction: boolean;
    criminalCivilProcess: boolean;
    asbestosEnforcement: boolean;
  };
}

export interface ApplicationWizardData {
  // Step 1: Contact
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  contactRelationship: string;
  isAdultAndAuthorized: boolean;
  permissionToEmail: boolean;

  // Step 2: Scope
  scopePerformsAbatement: boolean;
  scopeServiceBuildings: boolean;
  scopeServiceOthers: boolean;
  scopeTransport: boolean;
  scopeSurveys: boolean;

  // Step 3: Firm
  firmLegalName: string;
  firmAddress: string;
  firmAccountNumber: string;
  firmClassificationUnit: string;
  firmTradeName: string;
  firmWorkersCount: number;
  firmNopDate: string;
  firmNopNumber: string;
  firmCertLevel1to4: number;
  firmCertLevel3: number;
  ackNonTransferable: boolean;

  // Step 4: License History
  historyRefused7Years: boolean;
  historyRefusedAuth: boolean;
  historyNonCompliance: boolean;
  historySuspended: boolean;

  // Step 5: Associations
  associates: Associate[];

  // Step 7: Acknowledgements
  ackOutstandingAmounts: boolean;
  ackCompliance: boolean;
  ackEnforcement: boolean;
  reqWorkersCert: boolean;
  reqCompliance: boolean;
  reqRecords: boolean;
  reqCooperation: boolean;
}

export interface LicenseApplication {
  id: string;
  companyName: string;
  applicantName: string;
  email: string;
  phone: string;
  licenseType: LicenseType;
  address: string;
  status: ApplicationStatus;
  submissionDate: string;
  lastUpdated: string;
  lastEditedBy: string;
  safetyHistory: SafetyHistory;
  documents: DocumentAttachment[];
  adminNotes?: string;
  aiAnalysis?: string;
  
  // Detailed data from the wizard
  wizardData?: ApplicationWizardData;
}

export interface EmployerFactSheet {
  id: string; // Internal UUID
  employerLegalName: string;
  employerTradeName: string;
  employerId: string; // Business specific ID
  activeStatus: string;
  accountCoverage: string;
  firmType: string;
  employerStartDate: string;
  classificationUnit: string;
  employerCuStartDate: string;
  overdueBalance: number;
  currentAccountBalance: number;
}

export type ViewState = 
  | 'LANDING'
  | 'EMPLOYER_DASHBOARD'
  | 'EMPLOYER_NEW_FORM'
  | 'EMPLOYER_APP_DETAIL'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_REVIEW'
  | 'ADMIN_FACT_SHEETS'
  | 'ADMIN_FACT_SHEET_NEW';

export interface AIAnalysisResult {
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  webPresenceSummary: string; // New field for search-based summary
  concerns: string[];
  recommendation: string;
  sources?: { title: string; uri: string }[]; // New field for grounding sources
}