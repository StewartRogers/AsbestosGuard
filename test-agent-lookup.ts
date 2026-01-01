/**
 * Test script to verify agent name-to-ID resolution
 * Tests the resolveAgentId function
 */

import * as dotenv from 'dotenv';
import { resolveAgentId } from './services/foundryAgentClient.js';

dotenv.config({ path: '.env.local' });

async function testAgentLookup() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     AGENT NAME-TO-ID RESOLUTION TEST                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const agent1 = process.env.FOUNDRY_AGENT_1_ID;
  
  if (!agent1) {
    console.error('❌ ERROR: FOUNDRY_AGENT_1_ID not set in .env.local');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   FOUNDRY_AGENT_1_ID = "${agent1}"`);
  console.log('');

  try {
    // Test 1: Resolve agent (could be name or ID)
    console.log('🧪 TEST 1: Resolve agent identifier...');
    console.log(`   Input: "${agent1}"`);
    
    const resolvedId = await resolveAgentId(agent1);
    
    console.log(`   ✅ Resolved to: "${resolvedId}"`);
    console.log('');

    // Test 2: Try resolving again (should use cache)
    console.log('🧪 TEST 2: Resolve again (should use cache)...');
    const cachedId = await resolveAgentId(agent1);
    console.log(`   ✅ Cached result: "${cachedId}"`);
    console.log('');

    // Test 3: If input was a name, test with the ID directly
    if (!agent1.startsWith('asst_')) {
      console.log('🧪 TEST 3: Try using the resolved ID directly...');
      const directId = await resolveAgentId(resolvedId);
      console.log(`   ✅ Direct ID: "${directId}"`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ ALL TESTS PASSED');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Input identifier: ${agent1}`);
    console.log(`   Resolved agent ID: ${resolvedId}`);
    console.log(`   Type: ${agent1.startsWith('asst_') ? 'Agent ID (used directly)' : 'Agent Name (passed directly)'}`);
    console.log('');
    console.log('🎉 Your agent configuration is working correctly!');
    console.log('   You can now use agent names or IDs interchangeably in your code.');
    console.log('');

  } catch (error) {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.error('❌ TEST FAILED');
    console.error('');
    console.error('Error:', (error as Error).message);
    console.log('');
    
    if ((error as Error).message.includes('not found')) {
      console.log('💡 TROUBLESHOOTING:');
      console.log('');
      console.log('   1. Verify the agent exists in Azure AI Foundry Portal:');
      console.log('      https://ai.azure.com/');
      console.log('');
      console.log('   2. Check your project:');
      console.log('      Navigate to your project and click "Agents" in the left menu');
      console.log('');
      console.log('   3. Verify the agent name or ID:');
      console.log('      - Agent names are case-insensitive');
      console.log('      - Agent IDs start with "asst_"');
      console.log('');
      console.log('   4. Ensure you have permissions:');
      console.log('      - Your Azure credentials must have access to list agents');
      console.log('      - Try running: az login (if using Azure CLI)');
      console.log('');
    }
    
    process.exit(1);
  }
}

testAgentLookup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
