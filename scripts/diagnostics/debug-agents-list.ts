/**
 * Debug script to see the full agent response structure
 * This will help identify which field contains the actual agent ID
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

async function debugAgentsList() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       DEBUG AGENTS LIST STRUCTURE                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const endpoint = getProjectEndpoint();
  const token = await getAuthToken();

  const API_VERSIONS = ['2025-05-15-preview', '2025-05-01', '2024-12-01-preview'];
  
  for (const apiVersion of API_VERSIONS) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing API Version: ${apiVersion}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('');

    try {
      const url = `${endpoint}/agents?api-version=${apiVersion}`;
      console.log(`GET ${url}`);
      console.log('');

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.log(`❌ Failed: ${res.status} ${res.statusText}`);
        console.log(`Response: ${text}`);
        console.log('');
        continue;
      }

      const data = await res.json();
      
      console.log('✅ Success! Full response structure:');
      console.log('');
      console.log(JSON.stringify(data, null, 2));
      console.log('');

      // Parse agents from response
      const agents = data.data || data.value || [];
      
      if (Array.isArray(agents) && agents.length > 0) {
        console.log(`Found ${agents.length} agent(s):`);
        console.log('');

        agents.forEach((agent: any, index: number) => {
          console.log(`Agent #${index + 1}:`);
          console.log(`  All fields:`, Object.keys(agent));
          console.log(`  id: ${agent.id || '(not present)'}`);
          console.log(`  name: ${agent.name || '(not present)'}`);
          console.log(`  assistant_id: ${agent.assistant_id || '(not present)'}`);
          console.log(`  model: ${agent.model || '(not present)'}`);
          console.log(`  object: ${agent.object || '(not present)'}`);
          console.log('');
        });

        // Show which field to use
        const firstAgent = agents[0];
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('IMPORTANT: Which field contains the actual agent ID?');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        
        if (firstAgent.id && firstAgent.id.startsWith('asst_')) {
          console.log(`✅ Use: agent.id = "${firstAgent.id}"`);
        } else if (firstAgent.assistant_id && firstAgent.assistant_id.startsWith('asst_')) {
          console.log(`✅ Use: agent.assistant_id = "${firstAgent.assistant_id}"`);
        } else {
          console.log(`⚠️  No field starts with 'asst_'`);
          console.log(`   agent.id = "${firstAgent.id}"`);
          console.log(`   agent.name = "${firstAgent.name}"`);
          console.log('');
          console.log('   The API might accept custom IDs, or you need to create agents properly.');
        }
        console.log('');
      } else {
        console.log('No agents found or unexpected response structure.');
        console.log('');
      }

      // Only show first working version
      break;

    } catch (error) {
      console.log(`❌ Error: ${(error as Error).message}`);
      console.log('');
    }
  }
}

debugAgentsList().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
