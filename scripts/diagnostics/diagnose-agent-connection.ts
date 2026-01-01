/**
 * Diagnostic tool to identify and verify which agent is being used
 * Shows exactly which agent is configured and what it does
 */

import { DefaultAzureCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const AI_SCOPE = 'https://ai.azure.com/.default';

async function getAuthToken(): Promise<string> {
  if (process.env.AGENT_TOKEN) return process.env.AGENT_TOKEN as string;
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken(AI_SCOPE);
  if (!token?.token) throw new Error('Failed to acquire Azure AI Foundry token');
  return token.token;
}

function getProjectEndpoint(): string {
  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
  if (!endpoint) {
    throw new Error('Missing AZURE_AI_FOUNDRY_PROJECT_ENDPOINT');
  }
  return endpoint.replace(/\/$/, '');
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = getProjectEndpoint();
  const token = await getAuthToken();
  const fullUrl = `${endpoint}${path}`;
  const res = await fetch(fullUrl, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

async function getAgentInfo(assistantId: string): Promise<any> {
  const API_VERSIONS = ['2025-05-01', '2025-05-15-preview', '2025-05-01-preview', '2024-12-01-preview'];
  
  for (const apiVersion of API_VERSIONS) {
    try {
      const result = await api(`/agents/${assistantId}?api-version=${apiVersion}`);
      return result;
    } catch (err) {
      // Try next version
    }
  }
  
  return null;
}

async function diagnoseAgents() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   AGENT CONNECTION DIAGNOSTIC                                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('📋 ENVIRONMENT CONFIGURATION:');
  console.log('');
  
  const endpoint = getProjectEndpoint();
  console.log(`   Project Endpoint: ${endpoint}`);
  console.log(`   Project: rsrogers-8077`);
  console.log('');

  // Show configured agent IDs
  console.log('🔧 CONFIGURED AGENT IDS (.env.local):');
  console.log('');
  
  const agent1 = process.env.FOUNDRY_AGENT_1_ID;
  const agent2 = process.env.FOUNDRY_AGENT_2_ID;
  const agent3 = process.env.FOUNDRY_AGENT_3_ID;

  console.log(`   AGENT 1: ${agent1 || '(not set)'}`);
  console.log(`   AGENT 2: ${agent2 || '(not set)'}`);
  console.log(`   AGENT 3: ${agent3 || '(not set)'}`);
  console.log('');

  if (!agent1 && !agent2 && !agent3) {
    console.error('❌ ERROR: No agents configured in .env.local');
    console.log('   You need to set at least FOUNDRY_AGENT_1_ID');
    process.exit(1);
  }

  // Try to get info about configured agents
  console.log('🔍 VERIFYING AGENT CONFIGURATION:');
  console.log('');
  
  const agents = [
    { name: 'AGENT 1', id: agent1 },
    { name: 'AGENT 2', id: agent2 },
    { name: 'AGENT 3', id: agent3 }
  ];

  for (const agent of agents) {
    if (!agent.id) {
      console.log(`   ${agent.name}: (not configured)`);
      continue;
    }

    try {
      console.log(`   ${agent.name}: ${agent.id}`);
      const info = await getAgentInfo(agent.id);
      
      if (info) {
        const name = info.name || info.model || '(unknown)';
        const description = info.instructions ? info.instructions.substring(0, 100) : '(no description)';
        console.log(`      Name: ${name}`);
        console.log(`      Status: ✅ EXISTS in Foundry project`);
        console.log(`      Description: ${description}...`);
      } else {
        console.log(`      Status: ⚠️ CANNOT VERIFY (may not exist or insufficient permissions)`);
      }
    } catch (error) {
      console.log(`      Status: ❌ ERROR - ${(error as Error).message.substring(0, 50)}`);
    }
    console.log('');
  }

  // Show which agent is being used
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 CURRENT SETUP:');
  console.log('');
  console.log(`   Your code is using: FOUNDRY_AGENT_1_ID`);
  console.log(`   Which is set to:    ${agent1}`);
  console.log('');

  if (agent1) {
    // Try to fetch thread to test actual connectivity
    try {
      console.log('🧪 TESTING AGENT CONNECTION:');
      console.log('');
      console.log(`   Creating test thread...`);
      
      const threadResult = await api<{ id: string }>(`/threads?api-version=2025-05-01`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      console.log(`   ✅ Thread created: ${threadResult.id}`);
      console.log('');
      console.log('   Adding test message...');
      
      await api(`/threads/${threadResult.id}/messages?api-version=2025-05-01`, {
        method: 'POST',
        body: JSON.stringify({ role: 'user', content: 'Hello' })
      });
      
      console.log(`   ✅ Message added`);
      console.log('');
      console.log(`   Running agent: ${agent1}`);
      
      const runResult = await api<{ id: string; status: string }>(`/threads/${threadResult.id}/runs?api-version=2025-05-01`, {
        method: 'POST',
        body: JSON.stringify({ assistant_id: agent1 })
      });
      
      console.log(`   ✅ Run created: ${runResult.id}`);
      console.log(`   ✅ Status: ${runResult.status}`);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('✅ CONNECTION VERIFIED');
      console.log('');
      console.log('   Your agent is successfully connecting to the Foundry API.');
      console.log(`   Agent ID: ${agent1} is responding.`);
      console.log('');
      console.log('⚠️  NOTE: We cannot retrieve the agent\'s name/description through the API.');
      console.log('   To verify which actual agent this is, you need to:');
      console.log('');
      console.log('   1. Go to Azure AI Foundry Portal: https://ai.azure.com/');
      console.log('   2. Navigate to your project: rsrogers-8077');
      console.log('   3. Go to "Agents" section');
      console.log('   4. Search for agent ID: ' + agent1);
      console.log('   5. Verify the agent name and purpose');
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ CONNECTION FAILED`);
      console.log(`   Error: ${(error as Error).message}`);
      console.log('');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📖 NEXT STEPS:');
  console.log('');
  console.log('   1. Go to: https://ai.azure.com/');
  console.log('   2. Open project: rsrogers-8077');
  console.log('   3. Click "Agents" in left navigation');
  console.log('   4. Find agent by ID to see its name and configuration');
  console.log('');
  console.log('   If this is NOT the agent you want, ask for:');
  console.log('   - The CORRECT agent ID or name you want to use');
  console.log('   - We can then update .env.local with the right ID');
  console.log('');
}

diagnoseAgents().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
