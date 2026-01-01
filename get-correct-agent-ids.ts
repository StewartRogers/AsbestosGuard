/**
 * Discover actual agent IDs in your Azure AI Foundry project
 * Agent IDs start with 'asst_' and are different from agent names
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
const envPath = path.resolve(__dirname, '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ ERROR: Could not load .env.local');
  console.error(`   Path: ${envPath}`);
  console.error(`   Error: ${result.error}`);
  process.exit(1);
}

async function getAgentIds() {
  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;

  if (!endpoint) {
    console.error('❌ ERROR: AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set in .env.local');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    Azure AI Foundry Agent ID Discovery                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📍 Configuration loaded from .env.local');
  console.log(`   Endpoint: ${endpoint}`);
  console.log('');

  try {
    // Get access token
    console.log('🔑 Acquiring access token...');
    const token = execSync(
      `az account get-access-token --resource "https://ai.azure.com" --query accessToken -o tsv`,
      { encoding: 'utf-8' }
    ).trim();

    // Try multiple API versions from .env.local
    const apiVersionsEnv = process.env.AZURE_AI_FOUNDRY_API_VERSIONS;
    
    if (!apiVersionsEnv) {
      console.warn('⚠️  AZURE_AI_FOUNDRY_API_VERSIONS not set in .env.local, using defaults');
    }
    
    const apiVersions = apiVersionsEnv 
      ? apiVersionsEnv.split(',').map(v => v.trim())
      : ['2025-05-15-preview', '2025-05-01', '2025-05-01-preview', '2024-12-01-preview', '2024-11-01-preview'];
    
    
    console.log(`📤 Trying API versions: ${apiVersions.join(', ')}`);
    console.log('');

    let agents: any[] = [];
    let successVersion = '';

    for (const apiVersion of apiVersions) {
      try {
        const url = `${endpoint.replace(/\/$/, '')}/assistants?api-version=${apiVersion}`;
        
        console.log(`   Trying ${apiVersion}...`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          agents = data.data || data.value || [];
          successVersion = apiVersion;
          console.log(`   ✅ Success with ${apiVersion}`);
          break;
        } else if (response.status === 400) {
          console.log(`   ❌ ${response.status} - Not supported`);
          continue;
        } else {
          const errorText = await response.text();
          console.log(`   ❌ ${response.status} - ${errorText.substring(0, 50)}`);
          continue;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${(err as Error).message}`);
        continue;
      }
    }

    if (agents.length === 0) {
      console.error('');
      console.error('❌ Could not fetch agents with any API version');
      console.error('   Tried versions:', apiVersions.join(', '));
      process.exit(1);
    }

    console.log('');
    console.log(`✅ Found ${agents.length} agent(s) using ${successVersion}:`);
    console.log('');
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('Copy these IDs to your .env.local file:');
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('');

    agents.forEach((agent: any, index: number) => {
      const agentNumber = index + 1;
      const name = agent.name || agent.id || '(unnamed)';
      const id = agent.id;
      
      console.log(`Agent ${agentNumber}:`);
      console.log(`  Name: ${name}`);
      console.log(`  ID:   ${id}`);
      console.log(`  env:  FOUNDRY_AGENT_${agentNumber}_ID=${id}`);
      console.log('');
    });

    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('🔧 Update .env.local with:');
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    
    agents.forEach((agent: any, index: number) => {
      const agentNumber = index + 1;
      console.log(`FOUNDRY_AGENT_${agentNumber}_ID=${agent.id}`);
    });

    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   • Use the ID (asst_...), NOT the name');
    console.log('   • Agent IDs must start with "asst_"');
    console.log('   • Replace EFSAGENT, APPRISKANALYSIS, EMPWEBPROFILEAGENT with actual IDs');
    console.log('   • API version used: ' + successVersion);
    console.log('');

  } catch (error) {
    const err = error as Error;
    if (err.message.includes('az')) {
      console.error('❌ ERROR: Azure CLI not found or not logged in');
      console.error('   Run: az login');
    } else {
      console.error(`❌ ERROR: ${err.message}`);
    }
    process.exit(1);
  }
}

getAgentIds();
