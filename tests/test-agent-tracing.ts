/**
 * Test script to verify EFSAGENT (agent1) is working and generating traces
 * This will help diagnose why traces aren't showing up in Azure Foundry
 */

import { askAgent } from '../services/foundryAgentClient.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const AGENT_1_ID = process.env.FOUNDRY_AGENT_1_ID;

if (!AGENT_1_ID) {
  throw new Error('FOUNDRY_AGENT_1_ID must be set in .env.local');
}

async function testAgentTracing() {
  console.log('='.repeat(80));
  console.log('EFSAGENT (agent1) Tracing Diagnostic Test');
  console.log('='.repeat(80));
  console.log('');

  // Verify environment configuration
  console.log('📋 Environment Configuration:');
  console.log(`   Project Endpoint: ${process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || 'NOT SET'}`);
  console.log(`   Agent 1 ID: ${AGENT_1_ID}`);
  console.log(`   API Version: ${process.env.AZURE_AI_FOUNDRY_API_VERSION || 'using default'}`);
  console.log('');

  if (!process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT) {
    console.error('❌ ERROR: AZURE_AI_FOUNDRY_PROJECT_ENDPOINT is not set!');
    console.error('   This is required for the agent to work.');
    return;
  }

  // Test 1: Simple "Hello" test
  console.log('🧪 Test 1: Simple Agent Interaction');
  console.log('   Sending: "Hello, are you working?"');
  try {
    const start = Date.now();
    const resp = await askAgent(AGENT_1_ID, 'Hello, are you working?', {
      timeoutMs: 30000,
      pollMs: 1000
    });
    const response = resp.response;
    const duration = Date.now() - start;
    
    // Validate JSON response (EFSAGENT should return JSON)
    let isValidJson = false;
    try {
      JSON.parse(response);
      isValidJson = true;
    } catch (e) {
      isValidJson = false;
    }
    
    console.log(`   ✅ SUCCESS (${duration}ms)`);
    console.log(`   CONFIRMED: Agent ${AGENT_1_ID} processed this request`);
    console.log(`   Response format: ${isValidJson ? '✅ Valid JSON' : '⚠️ Not JSON'}`);
    console.log(`   Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
    console.log('');
  } catch (error) {
    console.error('   ❌ FAILED:', (error as Error).message);
    console.error('');
    return;
  }

  // Test 2: Structured analysis request (simulates real usage)
  console.log('🧪 Test 2: Structured Analysis Request');
  console.log('   Sending application analysis request...');
  
  const testPrompt = `Analyze this asbestos work license application:

Company: Test Company Ltd
Account Number: TEST-001
Workers: 5
Years in Business: 10
Has Internal Record: Yes
Overdue Balance: $0

Certifications:
- Level 1-4 Certified: 5
- Level 3 Certified: 2

History Flags:
- Refused in Last 7 Years: No
- Enforcement Action: No
- Non-Compliance: No
- Suspended: No

Respond with JSON including risk assessment.`;

  try {
    const start = Date.now();
    const resp = await askAgent(AGENT_1_ID, testPrompt, {
      timeoutMs: 60000,
      pollMs: 1000
    });
    const response = resp.response;
    const duration = Date.now() - start;
    
    // Validate JSON response (EFSAGENT should return JSON)
    let isValidJson = false;
    try {
      JSON.parse(response);
      isValidJson = true;
    } catch (e) {
      isValidJson = false;
    }
    
    console.log(`   ✅ SUCCESS (${duration}ms)`);
    console.log(`   CONFIRMED: Agent ${AGENT_1_ID} processed this request`);
    console.log(`   Response format: ${isValidJson ? '✅ Valid JSON' : '⚠️ Not JSON'}`);
    console.log(`   Response length: ${response.length} characters`);
    console.log(`   Response preview: ${response.substring(0, 300)}${response.length > 300 ? '...' : ''}`);
    console.log('');
  } catch (error) {
    console.error('   ❌ FAILED:', (error as Error).message);
    console.error('');
    return;
  }

  // Summary
  console.log('='.repeat(80));
  console.log('✅ ALL TESTS PASSED');
  console.log('');
  console.log('📊 Trace Analysis:');
  console.log('   If traces are still not appearing in Azure Foundry:');
  console.log('');
  console.log('   1. Check your project has tracing enabled:');
  console.log('      • Go to Azure AI Foundry portal');
  console.log('      • Navigate to your project: rsrogers-8077');
  console.log('      • Check Settings → Tracing');
  console.log('');
  console.log('   2. Verify the agent is in the same project:');
  console.log(`      • Agent ID: ${AGENT_1_ID}`);
  console.log('      • Should be visible in your project\'s Agents section');
  console.log('');
  console.log('   3. Check trace collection settings:');
  console.log('      • Traces may take 1-5 minutes to appear');
  console.log('      • Filter by agent name: EFSAGENT');
  console.log('      • Check date/time range includes test execution');
  console.log('');
  console.log('   4. Verify Application Insights connection (if used):');
  console.log('      • Check if APPLICATIONINSIGHTS_CONNECTION_STRING is set');
  console.log('      • Traces might be going to App Insights instead');
  console.log('');
  console.log('='.repeat(80));
}

// Run the test
testAgentTracing().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
