/**
 * Test script to verify agent name-to-ID resolution
 * DEPRECATED: resolveAgentId function no longer exists
 * This test is obsolete and should be removed
 */

import * as dotenv from 'dotenv';
// import { resolveAgentId } from './services/foundryAgentClient.js'; // Function removed

dotenv.config({ path: '.env.local' });

async function testAgentLookup() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     AGENT NAME-TO-ID RESOLUTION TEST                            ║');
  console.log('║                              (DEPRECATED)                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.warn('⚠️  This test is deprecated - resolveAgentId function has been removed');
  console.warn('⚠️  Use agent IDs directly from FOUNDRY_AGENT_*_ID environment variables');
  process.exit(0);
}

testAgentLookup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
