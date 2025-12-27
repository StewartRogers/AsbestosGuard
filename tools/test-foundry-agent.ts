import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env.local') });

import { chatWithAgent } from '../services/foundryService.js';

async function main() {
  const agentKey = (process.argv[2] as 'agent1' | 'agent2' | 'agent3') || 'agent1';
  const prompt = process.argv.slice(3).join(' ') || 'Say hello from Foundry agent.';
  try {
    const { reply } = await chatWithAgent(agentKey, prompt);
    console.log('Reply:', reply);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

main();
