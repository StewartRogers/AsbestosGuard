import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
// Load .env.local explicitly
const envPath = path.resolve(rootDir, '.env.local');
console.log(`📂 Loading env from: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.warn(`⚠️  Could not load .env.local: ${result.error.message}`);
}
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Azure AI Foundry Agent Configuration');
    console.log('='.repeat(60) + '\n');
    // Show current config
    console.log('📋 Current Configuration:');
    console.log(`   AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=${process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || '(not set)'}`);
    console.log(`   FOUNDRY_AGENT_1_ID=${process.env.FOUNDRY_AGENT_1_ID || '(not set)'}`);
    console.log(`   FOUNDRY_AGENT_2_ID=${process.env.FOUNDRY_AGENT_2_ID || '(not set)'}`);
    console.log(`   FOUNDRY_AGENT_3_ID=${process.env.FOUNDRY_AGENT_3_ID || '(not set)'}`);
    console.log();
    // Check if using names or IDs
    const agent1 = process.env.FOUNDRY_AGENT_1_ID;
    if (agent1) {
        const isId = agent1.startsWith('asst_');
        const type = isId ? 'ID' : 'NAME';
        console.log(`✅ Agent 1 is configured as ${type}: ${agent1}`);
    }
    else {
        console.log('❌ Agent 1 is not configured');
    }
    console.log();
    console.log('💡 To use your agents:');
    console.log('   1. If using agent NAMES (e.g., "EFSAGENT"):');
    console.log('      FOUNDRY_AGENT_1_ID=EFSAGENT');
    console.log('   2. If using agent IDs (e.g., "asst_abc123"):');
    console.log('      FOUNDRY_AGENT_1_ID=asst_abc123');
    console.log();
    console.log('   Try the test with your current config:');
    console.log('   npm run test:foundry -- agent1 "Hello"');
    console.log();
}
main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
