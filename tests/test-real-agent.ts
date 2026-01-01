/**
 * Test script to prove Azure AI Foundry native agents are actually being invoked
 * Sends a unique test prompt and captures the response to verify it's not hardcoded
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Initialize tracing FIRST before importing agent client
import '../services/tracing-setup.js';

import { askAgent } from '../services/foundryAgentClient.js';
import { trace } from '@opentelemetry/api';

interface InvokeResponse {
  agent_id: string;
  response: string;
  duration_ms: number;
}

async function testRealAgent() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          PROOF OF CONCEPT: Real Azure AI Foundry Native Agent Test             ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

  const agentId = process.env.FOUNDRY_AGENT_1_ID;
  if (!agentId) {
    console.error('❌ ERROR: FOUNDRY_AGENT_1_ID must be set in .env.local');
    process.exit(1);
  }

  const testPrompt = `You are an asbestos compliance expert. Please analyze this request:

A manufacturing company built in 1985 has been using asbestos-containing insulation in their facility. 
They want to know: 
1) What are the main health risks?
2) What regulations apply?
3) What immediate actions should they take?

Please provide a brief but comprehensive analysis.`;

  console.log(`📤 Sending test prompt to agent: ${agentId}`);
  console.log(`⏱️  Timeout: 60 seconds\n`);

  const tracingEnabled = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ? '✅ ENABLED' : '⚠️ DISABLED';
  console.log(`📊 Tracing Status: ${tracingEnabled}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PROMPT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(testPrompt);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⏳ Waiting for agent response...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const inlineTracer = trace.getTracer('real-agent-inline');
    const inlineSpan = inlineTracer.startSpan('real-agent-inline-span');
    inlineSpan.setAttribute('inline.test', true);
    inlineSpan.addEvent('inline-span-started');
    console.log('🧪 Inline span created in test-real-agent.ts');

    const resp: InvokeResponse = await askAgent(agentId, testPrompt);
    const response = resp.response;

    console.log('✅ AGENT RESPONSE RECEIVED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Validation
    const responseLength = response.length;
    let isValidJson = false;
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(response);
      isValidJson = true;
    } catch {
      isValidJson = false;
    }

    const responseLower = response.toLowerCase();
    const containsAnalysis = responseLower.includes('analys') ||
                             responseLower.includes('risk') ||
                             responseLower.includes('regulation') ||
                             responseLower.includes('action');
    const containsAsbestos = responseLower.includes('asbestos');
    const containsHealth = responseLower.includes('health') ||
                           responseLower.includes('danger') ||
                           responseLower.includes('risk');
    const isNotMockResponse = !responseLower.includes('mock response') &&
                              !responseLower.includes('test response') &&
                              !responseLower.includes('hardcoded');

    console.log('📊 PROOF OF REAL AGENT USAGE:');
    console.log(`✓ Agent ID: ${agentId}`);
    console.log(`✓ Response length: ${responseLength} characters`);
    console.log(`✓ JSON Format: ${isValidJson ? '✅ VALID JSON' : '❌ NOT VALID JSON'}`);
    if (isValidJson) {
      console.log(`  └─ JSON keys: ${Object.keys(parsedJson).join(', ')}`);
    }
    console.log(`✓ Contains substantive analysis: ${containsAnalysis ? 'YES' : 'NO'}`);
    console.log(`✓ Mentions asbestos: ${containsAsbestos ? 'YES' : 'NO'}`);
    console.log(`✓ Discusses health/risks: ${containsHealth ? 'YES' : 'NO'}`);
    console.log(`✓ Is NOT hardcoded mock response: ${isNotMockResponse ? 'YES' : 'NO'}`);
    console.log('');

    if (containsAnalysis && containsAsbestos && containsHealth && isNotMockResponse && isValidJson) {
      console.log('✅ ✅ ✅ CONFIRMED: Agent responded with valid JSON analysis! ✅ ✅ ✅');
    } else {
      console.log('⚠️  Response validation failed - check above metrics');
    }

    inlineSpan.addEvent('inline-span-ending');
    inlineSpan.end();
    console.log('🧪 Inline span ended');

    console.log('\n⏳ Waiting 20 seconds for traces to export...');
    await new Promise(r => setTimeout(r, 20000));
    console.log('✅ Trace wait done');

  } catch (error) {
    console.error('❌ ERROR:', (error as Error).message);
    console.error('Stack:', (error as Error).stack);
    process.exit(1);
  }
}

async function main() {
  try {
    await testRealAgent();
    console.log('\n⏳ Waiting 3 seconds for final flush...');
    await new Promise(r => setTimeout(r, 3000));
    console.log('✅ Done - traces should now be in Application Insights');
  } catch (error) {
    console.error('❌ Error in main:', (error as Error).message);
    process.exit(1);
  }
}

main();
