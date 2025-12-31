import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env.local
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

async function getAgentIdByName(agentName: string): Promise<string | null> {
  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
  if (!endpoint) {
    console.error('❌ Missing AZURE_AI_FOUNDRY_PROJECT_ENDPOINT');
    return null;
  }

  try {
    // Get token
    const token = execSync(
      `az account get-access-token --resource "https://ai.azure.com" --query accessToken -o tsv`,
      { encoding: 'utf-8' }
    ).trim();

    const versions = process.env.AZURE_AI_FOUNDRY_API_VERSIONS;
    const apiVersions = versions 
      ? versions.split(',').map(v => v.trim())
      : ['2025-05-01', '2025-05-15-preview'];

    for (const apiVersion of apiVersions) {
      try {
        console.log(`\n🔍 Trying to get agent "${agentName}" with API version ${apiVersion}...`);
        
        // Try direct agent endpoint
        const url = `${endpoint.replace(/\/$/, '')}/agents/${agentName}?api-version=${apiVersion}`;
        console.log(`   URL: ${url}`);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            console.log(`✅ Found ID: ${data.id}`);
            return data.id;
          }
        } else {
          const text = await res.text();
          console.log(`   ❌ Failed: ${res.status} ${res.statusText}`);
          if (text) console.log(`   Response: ${text.substring(0, 200)}`);
        }
      } catch (err) {
        console.log(`   Error: ${(err as Error).message}`);
      }
    }

    return null;
  } catch (err) {
    console.error(`❌ Error: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  const agentName = process.argv[2] || 'EFSAGENT';

  console.log('='.repeat(60));
  console.log(`Get Agent ID for: ${agentName}`);
  console.log('='.repeat(60));

  const id = await getAgentIdByName(agentName);

  if (id) {
    console.log('\n' + '='.repeat(60));
    console.log('📝 Update your .env.local with:');
    console.log('='.repeat(60));
    
    if (agentName === 'EFSAGENT') {
      console.log(`\nFOUNDRY_AGENT_1_ID=${id}`);
    } else if (agentName === 'EMPWEBPROFILEAGENT') {
      console.log(`\nFOUNDRY_AGENT_2_ID=${id}`);
    } else if (agentName === 'APPRISKANALYSIS') {
      console.log(`\nFOUNDRY_AGENT_3_ID=${id}`);
    }
  } else {
    console.log('\n⚠️  Could not find agent ID. Try:');
    console.log('   1. Make sure agent name is correct');
    console.log('   2. Run: az login');
    console.log('   3. Check AZURE_AI_FOUNDRY_PROJECT_ENDPOINT in .env.local');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
