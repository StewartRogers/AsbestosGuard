/**
 * Test to find OpenAI-style assistants (asst_xxx format)
 * These are different from Azure AI Foundry native agents
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

async function findOpenAIAssistants() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  FIND OPENAI-STYLE ASSISTANTS (asst_xxx)                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const endpoint = getProjectEndpoint();
  const token = await getAuthToken();

  const API_VERSIONS = ['2025-05-15-preview', '2025-05-01', '2024-12-01-preview'];
  const ENDPOINTS_TO_TRY = [
    '/openai/assistants',
    '/assistants',
    '/agents',
    '/openai/agents'
  ];

  for (const path of ENDPOINTS_TO_TRY) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing Endpoint: ${path}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('');

    for (const apiVersion of API_VERSIONS) {
      const url = `${endpoint}${path}?api-version=${apiVersion}`;
      console.log(`GET ${url}`);

      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          console.log(`  ❌ ${res.status} ${res.statusText}`);
          continue;
        }

        const data = await res.json();
        const assistants = data.data || data.value || [];

        if (Array.isArray(assistants) && assistants.length > 0) {
          console.log(`  ✅ Success! Found ${assistants.length} items`);
          console.log('');

          assistants.forEach((item: any, index: number) => {
            console.log(`  Item #${index + 1}:`);
            console.log(`    id: ${item.id}`);
            console.log(`    name: ${item.name || '(no name)'}`);
            console.log(`    object: ${item.object || '(no object)'}`);
            
            if (item.id && item.id.startsWith('asst_')) {
              console.log(`    ✅ This is an OpenAI-style assistant!`);
            }
            console.log('');
          });

          // Found assistants, no need to try more versions
          console.log('  📋 Full response:');
          console.log(JSON.stringify(data, null, 2).substring(0, 2000));
          console.log('');
          console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('  ✅ FOUND OpenAI-style assistants at this endpoint!');
          console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          return; // Found them, stop searching
        } else {
          console.log(`  ⚠️  Empty list or unexpected format`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${(error as Error).message.substring(0, 100)}`);
      }

      console.log('');
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ Could not find OpenAI-style assistants');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('This means:');
  console.log('1. You may need to create OpenAI-style assistants via the Assistants API');
  console.log('2. Or use a different API endpoint for native Azure AI Foundry agents');
  console.log('3. Or your agents were deleted/migrated');
  console.log('');
  console.log('According to your ARCHITECTURE_DIAGRAM.txt, you had:');
  console.log('  - EFSAGENT: asst_WfzpVc2VFNSOimWtPFeH2M8A');
  console.log('  - EMPWEBPROFILEAGENT: asst_oKyLyTufq0RUcImmv4Wordy7');
  console.log('  - APPRISKANALYSIS: asst_dgZab8X0Y28EMqKpT9DbwBmb');
  console.log('');
  console.log('These IDs may no longer exist in your Azure AI Foundry project.');
  console.log('');
}

findOpenAIAssistants().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
