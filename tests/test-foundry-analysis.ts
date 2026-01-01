#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as foundryAnalysis from '../services/foundryAnalysisService.js';
import { LicenseType, ApplicationStatus } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Mock application for testing
const mockApplication = {
  id: 'TEST-001',
  companyName: 'Test Asbestos Company',
  applicantName: 'John Doe',
  email: 'john@test.com',
  phone: '555-0123',
  licenseType: LicenseType.CLASS_A,
  address: '123 Test St, Richmond BC',
  status: ApplicationStatus.SUBMITTED,
  submissionDate: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  lastEditedBy: 'Test User',
  safetyHistory: {
    hasViolations: false,
    yearsExperience: 5,
    insuranceExpiry: '2025-12-31'
  },
  documents: [],
  wizardData: {
    contactFirstName: 'John',
    contactLastName: 'Doe',
    contactPhone: '555-0123',
    contactEmail: 'john@test.com',
    contactRelationship: 'Owner',
    isAdultAndAuthorized: true,
    permissionToEmail: true,
    firmLegalName: 'Test Asbestos Corp',
    firmTradeName: 'Test Removal',
    firmAccountNumber: 'TEST-12345',
    firmAddress: '123 Test Street, Richmond BC',
    firmClassificationUnit: '2418 Service clean asbestos',
    firmWorkersCount: 10,
    firmNopDate: '2020-01-01',
    firmNopNumber: '',
    firmCertLevel1to4: 5,
    firmCertLevel3: 2,
    scopePerformsAbatement: true,
    scopeServiceBuildings: true,
    scopeServiceOthers: false,
    scopeTransport: false,
    scopeSurveys: false,
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
    reqCooperation: true
  }
};

async function testFoundryAnalysis() {
  console.log('\n=== Testing Foundry Analysis Integration ===\n');
  
  console.log('Checking environment...');
  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
  const agentId = process.env.FOUNDRY_AGENT_1_ID;
  
  if (!endpoint || !agentId) {
    console.error('❌ MISSING CONFIGURATION');
    console.error('  - AZURE_AI_FOUNDRY_PROJECT_ENDPOINT:', endpoint ? '✓ Set' : '✗ Not set');
    console.error('  - FOUNDRY_AGENT_1_ID:', agentId ? '✓ Set' : '✗ Not set');
    console.error('\nPlease set these in .env.local');
    process.exit(1);
  }
  
  console.log('✓ Environment configured');
  console.log(`  - Endpoint: ${endpoint}`);
  console.log(`  - Agent1 ID: ${agentId}\n`);
  
  console.log('Sending test application to Foundry agent1...');
  console.log('Application ID:', mockApplication.id);
  console.log('Company:', mockApplication.wizardData?.firmLegalName);
  console.log('Account Number:', mockApplication.wizardData?.firmAccountNumber);
  
  try {
    const result = await foundryAnalysis.analyzeApplication(mockApplication);
    
    console.log('\n✓ Analysis completed successfully\n');
    console.log('ANALYSIS RESULTS:');
    console.log('================');
    console.log(`Risk Score: ${result.riskScore}`);
    console.log(`Is Test Account: ${result.isTestAccount}`);
    console.log(`Summary: ${result.summary}`);
    console.log(`Recommendation: ${result.recommendation}`);
    console.log(`\nConcerns (${result.concerns.length}):`);
    result.concerns.forEach((c, i) => console.log(`  ${i+1}. ${c}`));
    console.log(`\nRequired Actions (${result.requiredActions.length}):`);
    result.requiredActions.forEach((a, i) => console.log(`  ${i+1}. ${a}`));
    
    console.log('\n✅ Foundry integration is working correctly!');
  } catch (error) {
    console.error('\n❌ Analysis failed:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

testFoundryAnalysis();
