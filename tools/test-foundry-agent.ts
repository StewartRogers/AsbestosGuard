import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env.local') });

import { chatWithAgent } from '../services/foundryService.js';

async function main() {
  const agentKey = process.argv[2] as 'agent1' | 'agent2' | 'agent3';
  const prompt = process.argv.slice(3).join(' ');
  
  if (!agentKey) {
    console.error('❌ ERROR: Agent key must be provided as argument');
    console.error('   Usage: npx tsx tools/test-foundry-agent.ts <agent-key> <prompt>');
    console.error('   Example: npx tsx tools/test-foundry-agent.ts agent1 "Hello"');
    process.exit(1);
  }
  
  if (!prompt) {
    console.error('❌ ERROR: Prompt must be provided as argument');
    console.error('   Usage: npx tsx tools/test-foundry-agent.ts <agent-key> <prompt>');
    console.error('   Example: npx tsx tools/test-foundry-agent.ts agent1 "Hello"');
    process.exit(1);
  }
  
  try {
    const { reply } = await chatWithAgent(agentKey, prompt);
    console.log('Reply:', reply);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

main();
