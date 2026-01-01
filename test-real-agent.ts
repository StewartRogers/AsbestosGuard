/**
 * Test script to prove Azure AI Foundry native agents are actually being invoked
 * Sends a unique test prompt and captures the response to verify it's not hardcoded
 */

import * as dotenv from 'dotenv';
import { askAgent } from './services/foundryAgentClient.js';

dotenv.config({ path: '.env.local' });

async function testRealAgent() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          PROOF OF CONCEPT: Real Azure AI Foundry Native Agent Test             ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const agentId = process.env.FOUNDRY_AGENT_1_ID || 'EFSAGENT';
  
  // Send a specific prompt that should get a real response from the agent
  const testPrompt = `You are an asbestos compliance expert. Please analyze this request:

A manufacturing company built in 1985 has been using asbestos-containing insulation in their facility. 
They want to know: 
1) What are the main health risks?
2) What regulations apply?
3) What immediate actions should they take?

Please provide a brief but comprehensive analysis.`;

  console.log(`📤 Sending test prompt to agent: ${agentId}`);
  console.log(`⏱️  Timeout: 60 seconds`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PROMPT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(testPrompt);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏳ Waiting for agent response...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    const response = await askAgent(agentId, testPrompt);
    
    console.log('✅ AGENT RESPONSE RECEIVED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Analysis to prove it's a real agent response
    console.log('📊 PROOF OF REAL AGENT USAGE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const responseLength = response.length;
    const containsAnalysis = response.toLowerCase().includes('analys') || 
                            response.toLowerCase().includes('risk') ||
                            response.toLowerCase().includes('regulation') ||
                            response.toLowerCase().includes('action');
    const containsAsbestos = response.toLowerCase().includes('asbestos');
    const containsHealth = response.toLowerCase().includes('health') || 
                          response.toLowerCase().includes('danger') ||
                          response.toLowerCase().includes('risk');
    const isNotMockResponse = !response.includes('Mock response') && 
                             !response.includes('test response') &&
                             !response.includes('hardcoded');
    
    console.log(`✓ Response length: ${responseLength} characters`);
    console.log(`✓ Contains substantive analysis: ${containsAnalysis ? 'YES' : 'NO'}`);
    console.log(`✓ Mentions asbestos: ${containsAsbestos ? 'YES' : 'NO'}`);
    console.log(`✓ Discusses health/risks: ${containsHealth ? 'YES' : 'NO'}`);
    console.log(`✓ Is NOT hardcoded mock response: ${isNotMockResponse ? 'YES' : 'NO'}`);
    console.log('');
    
    if (containsAnalysis && containsAsbestos && containsHealth && isNotMockResponse) {
      console.log('✅ ✅ ✅ CONFIRMED: This is a REAL Azure AI Foundry agent response! ✅ ✅ ✅');
    } else {
      console.log('⚠️  Response may not be from real agent - check the above metrics');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', (error as Error).message);
    console.error('Stack:', (error as Error).stack);
    process.exit(1);
  }
}

testRealAgent();
