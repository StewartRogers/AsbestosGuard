/**
 * Simple tool to show exactly which agent is being used
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('\n════════════════════════════════════════════════════════════════');
console.log('                   AGENT CONNECTION INFO                          ');
console.log('════════════════════════════════════════════════════════════════\n');

const agent1 = process.env.FOUNDRY_AGENT_1_ID;
const agent2 = process.env.FOUNDRY_AGENT_2_ID;
const agent3 = process.env.FOUNDRY_AGENT_3_ID;

console.log('📋 AGENTS CONFIGURED IN .env.local:\n');
console.log(`  AGENT 1 (EFSAGENT):        ${agent1 || '(not set)'}`);
console.log(`  AGENT 2:                   ${agent2 || '(not set)'}`);
console.log(`  AGENT 3:                   ${agent3 || '(not set)'}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('🔴 PROBLEM: You have hardcoded agent IDs but don\'t know which');
console.log('   agents they actually are.\n');

console.log('✅ SOLUTION:\n');

console.log('   1. Go to Azure AI Foundry Portal:');
console.log('      👉 https://ai.azure.com/\n');

console.log('   2. Select your project: rsrogers-8077\n');

console.log('   3. Click "Agents" in the left navigation\n');

console.log('   4. You will see a list of agents with:');
console.log('      - Agent name (e.g., "EFSAGENT", "Compliance Agent", etc)');
console.log('      - Agent ID (starting with "asst_")\n');

console.log('   5. Find which agent is which by matching these IDs:');
console.log(`      - ${agent1}`);
console.log(`      - ${agent2}`);
console.log(`      - ${agent3}\n`);

console.log('   6. Once you know which is which, tell me:');
console.log('      - Which agent you WANT to use (EFSAGENT? Compliance?)');
console.log('      - We\'ll verify and fix the configuration\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📌 CURRENT USAGE:\n');
console.log(`   Your code uses: foundryAnalysisService.ts`);
console.log(`   Which calls:   AGENT_1_ID = ${agent1}`);
console.log(`   For:           analyzeApplication()\n`);

console.log('════════════════════════════════════════════════════════════════\n');
