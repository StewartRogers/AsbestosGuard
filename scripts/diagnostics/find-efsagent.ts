/**
 * Discover agents in Foundry project and find EFSAGENT
 */

import { DefaultAzureCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const AI_SCOPE = 'https://ai.azure.com/.default';

async function getAuthToken(): Promise<string> {
  if (process.env.AGENT_TOKEN) return process.env.AGENT_TOKEN as string;
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken(AI_SCOPE);
  if (!token?.token) throw new Error('Failed to acquire token');
  return token.token;
}

function getProjectEndpoint(): string {
  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
  if (!endpoint) throw new Error('Missing AZURE_AI_FOUNDRY_PROJECT_ENDPOINT');
  return endpoint.replace(/\/$/, '');
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = getProjectEndpoint();
  const token = await getAuthToken();
  const fullUrl = `${endpoint}${path}`;
  console.log(`[API] GET ${fullUrl.substring(0, 80)}...`);
  
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
    throw new Error(`API error: ${res.status} ${text}`);
  }
  
  return res.json() as Promise<T>;
}

async function discoverAgents() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            DISCOVERING AGENTS IN FOUNDRY PROJECT                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const versions = process.env.AZURE_AI_FOUNDRY_API_VERSIONS;
  const API_VERSIONS = versions 
    ? versions.split(',').map(v => v.trim())
    : ['2025-05-15-preview', '2025-05-01', '2025-05-01-preview', '2024-12-01-preview'];
  
  let agents: any[] = [];
  let foundVersion = '';

  // Try to list agents with different API versions
  for (const apiVersion of API_VERSIONS) {
    try {
      console.log(`Trying API version: ${apiVersion}...`);
      const result = await api<any>(`/agents?api-version=${apiVersion}`);
      
      // Handle different response formats
      if (Array.isArray(result)) {
        agents = result;
      } else if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as any).data)) {
        agents = (result as any).data;
      }
      
      if (agents.length > 0) {
        foundVersion = apiVersion;
        console.log(`✅ Found ${agents.length} agents with API version ${apiVersion}\n`);
        break;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${(error as Error).message.substring(0, 50)}\n`);
    }
  }

  if (agents.length === 0) {
    console.log('❌ Could not discover agents from API');
    console.log('\nTrying alternative: Using configured agent IDs...\n');
    
    // Fall back to configured IDs
    const configured = [
      { id: process.env.FOUNDRY_AGENT_1_ID, name: 'AGENT 1' },
      { id: process.env.FOUNDRY_AGENT_2_ID, name: 'AGENT 2' },
      { id: process.env.FOUNDRY_AGENT_3_ID, name: 'AGENT 3' }
    ];
    
    for (const agent of configured) {
      if (agent.id) {
        console.log(`📌 ${agent.name}: ${agent.id}`);
      }
    }
    
    console.log('\n⚠️  Cannot get agent details from API.');
    console.log('\n✅ SOLUTION: Go to Foundry portal to find EFSAGENT ID:\n');
    console.log('   1. Open: https://ai.azure.com/');
    console.log('   2. Project: rsrogers-8077');
    console.log('   3. Click "Agents" in left nav');
    console.log('   4. Find "EFSAGENT" and copy its ID (asst_...)');
    console.log('   5. Tell me the ID and we\'ll update .env.local\n');
    
    return;
  }

  // Display all agents
  console.log('📋 ALL AGENTS IN PROJECT:\n');
  
  let efsagent = null;
  
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const name = agent.name || agent.model || '(unnamed)';
    const id = agent.id || agent.assistant_id || '(no id)';
    const desc = agent.description || agent.instructions?.substring(0, 60) || '';
    
    console.log(`   ${i + 1}. ${name}`);
    console.log(`      ID: ${id}`);
    if (desc) console.log(`      Description: ${desc}...`);
    
    if (name.toUpperCase().includes('EFS') || name.toUpperCase() === 'EFSAGENT') {
      efsagent = { name, id };
      console.log(`      ⭐ THIS IS EFSAGENT!`);
    }
    
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (efsagent) {
    console.log(`✅ FOUND EFSAGENT!\n`);
    console.log(`   Agent Name: ${efsagent.name}`);
    console.log(`   Agent ID:   ${efsagent.id}\n`);
    console.log('📝 UPDATE .env.local with:\n');
    console.log(`   FOUNDRY_AGENT_1_ID=${efsagent.id}\n`);
  } else {
    console.log('⚠️  EFSAGENT not found in the agent list');
    console.log('\n   Did you mean one of these?');
    for (const agent of agents) {
      console.log(`   - ${agent.name || '(unnamed)'}`);
    }
    console.log('');
  }
}

discoverAgents().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
