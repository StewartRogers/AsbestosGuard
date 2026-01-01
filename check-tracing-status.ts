/**
 * Diagnostic script to verify tracing configuration for EFSAGENT tests
 * Checks:
 * 1. EFSAGENT is configured in .env.local
 * 2. Azure AI Foundry endpoint is set
 * 3. Application Insights connection string is configured (optional but recommended)
 * 4. Bridge service URL is configured
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    TRACING CONFIGURATION DIAGNOSTIC                           ║');
console.log('║              Verifies EFSAGENT Test & Tracing Requirements                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Load environment
dotenv.config({ path: '.env.local' });

const checks: { name: string; result: boolean; details: string }[] = [];

// 1. Check EFSAGENT configuration
console.log('🔍 Checking EFSAGENT Configuration...');
const agentId = process.env.FOUNDRY_AGENT_1_ID;
checks.push({
  name: 'EFSAGENT ID (FOUNDRY_AGENT_1_ID)',
  result: agentId === 'EFSAGENT',
  details: agentId ? `Found: ${agentId}` : 'NOT SET - Expected: EFSAGENT'
});
console.log(`  ${checks[checks.length - 1].result ? '✅' : '❌'} ${checks[checks.length - 1].details}`);
console.log('');

// 2. Check Azure AI Foundry endpoint
console.log('🔍 Checking Azure AI Foundry Configuration...');
const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
checks.push({
  name: 'Foundry Endpoint',
  result: !!endpoint,
  details: endpoint ? `Found: ${endpoint.substring(0, 60)}...` : 'NOT SET'
});
console.log(`  ${checks[checks.length - 1].result ? '✅' : '❌'} ${checks[checks.length - 1].details}`);
console.log('');

// 3. Check Bridge service URL
console.log('🔍 Checking Bridge Service Configuration...');
const bridgeUrl = process.env.AGENT_BRIDGE_SERVICE_URL || 'http://127.0.0.1:8001';
checks.push({
  name: 'Bridge Service URL',
  result: !!process.env.AGENT_BRIDGE_SERVICE_URL || true, // Default is OK
  details: `Configured: ${bridgeUrl}`
});
console.log(`  ${checks[checks.length - 1].result ? '✅' : '❌'} ${checks[checks.length - 1].details}`);
console.log('');

// 4. Check tracing setup
console.log('🔍 Checking Tracing Configuration...');
const appInsightsConn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
const tracingStatus = appInsightsConn ? '✅ ENABLED' : '⚠️ DISABLED';
const tracingDetails = appInsightsConn 
  ? `Connected to: ${appInsightsConn.split(';')[0]}`
  : 'Traces will NOT be sent to Application Insights (optional)';

checks.push({
  name: 'Tracing (Application Insights)',
  result: !!appInsightsConn,
  details: tracingDetails
});
console.log(`  ${tracingStatus} ${tracingDetails}`);
console.log('');

// 5. Check for bridge service script
console.log('🔍 Checking Bridge Service Setup...');
const bridgeServiceExists = existsSync(path.join(__dirname, 'agent-bridge-service.py'));
checks.push({
  name: 'Bridge Service Script',
  result: bridgeServiceExists,
  details: bridgeServiceExists ? 'Found: agent-bridge-service.py' : 'NOT FOUND - Run setup'
});
console.log(`  ${checks[checks.length - 1].result ? '✅' : '❌'} ${checks[checks.length - 1].details}`);
console.log('');

// Summary
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('📋 SUMMARY:');
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('');

const passed = checks.filter(c => c.result).length;
const total = checks.length;

checks.forEach((check, i) => {
  console.log(`${i + 1}. ${check.result ? '✅' : '❌'} ${check.name}`);
  console.log(`   ${check.details}`);
  console.log('');
});

console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log(`RESULT: ${passed}/${total} checks passed`);
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('');

if (passed === total) {
  console.log('✅ ALL CHECKS PASSED - Ready to run tests!');
  console.log('');
  console.log('📝 To test EFSAGENT with proper tracing:');
  console.log('   1. Start bridge service: python agent-bridge-service.py');
  console.log('   2. In another terminal, run test:');
  console.log('      • npx tsx test-real-agent.ts  (Full test with JSON validation)');
  console.log('      • npx tsx test-agent-tracing.ts (Detailed tracing test)');
  console.log('');
  if (!appInsightsConn) {
    console.log('⚠️  NOTE: Application Insights is not configured.');
    console.log('   To enable tracing to Azure Monitor:');
    console.log('   1. Create Application Insights in your Azure resource group');
    console.log('   2. Copy the connection string');
    console.log('   3. Add to .env.local: APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>');
  }
} else {
  console.log('❌ CONFIGURATION INCOMPLETE - Please fix the issues above');
  console.log('');
  console.log('Required for EFSAGENT to work:');
  if (!agentId || agentId !== 'EFSAGENT') {
    console.log('  • Set FOUNDRY_AGENT_1_ID=EFSAGENT in .env.local');
  }
  if (!endpoint) {
    console.log('  • Set AZURE_AI_FOUNDRY_PROJECT_ENDPOINT in .env.local');
  }
}

console.log('');
