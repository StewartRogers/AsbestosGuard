/**
 * Query Application Insights to confirm agent usage
 * Shows traces and logs from agent invocations
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

async function queryAppInsights() {
  const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connString) {
    console.error('❌ ERROR: APPLICATIONINSIGHTS_CONNECTION_STRING not set in .env.local');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              Application Insights - Agent Usage Confirmation                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Extract instrumentation key from connection string
  const keyMatch = connString.match(/InstrumentationKey=([^;]+)/);
  const instrKey = keyMatch ? keyMatch[1] : null;

  if (!instrKey) {
    console.error('❌ ERROR: Could not extract InstrumentationKey from connection string');
    process.exit(1);
  }

  console.log(`✅ Application Insights connected`);
  console.log(`   Instrumentation Key: ${instrKey.substring(0, 8)}...${instrKey.substring(instrKey.length - 4)}`);
  console.log('');

  try {
    // Get access token for Azure Monitor
    console.log('🔑 Acquiring access token...');
    const token = execSync(
      `az account get-access-token --resource "https://api.applicationinsights.io" --query accessToken -o tsv`,
      { encoding: 'utf-8' }
    ).trim();

    // Query for agent-related traces (last 24 hours)
    const kuqlQuery = `
traces
| where cloud_RoleName == "azure-ai-foundry-agent-client" or message contains "foundryAgentClient"
| where timestamp > ago(24h)
| project 
    timestamp,
    message,
    severityLevel,
    customDimensions.agent_id,
    customDimensions.duration_ms,
    customDimensions.prompt_length,
    customDimensions.response_length
| order by timestamp desc
| limit 50
`;

    const encodedQuery = encodeURIComponent(kuqlQuery);
    const url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${encodedQuery}`;

    console.log('📊 Querying Application Insights for agent traces...');
    console.log('   (Last 24 hours, up to 50 records)');
    console.log('');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Query failed: ${response.status}`);
      console.error(errorData);
      
      // Fallback: show how to check manually
      console.log('');
      console.log('Alternative: Check traces in Azure Portal');
      console.log('1. Go to https://portal.azure.com');
      console.log('2. Find your Application Insights resource');
      console.log('3. Click "Logs" in the left menu');
      console.log('4. Run this KQL query:');
      console.log('');
      console.log('traces');
      console.log('| where cloud_RoleName == "azure-ai-foundry-agent-client"');
      console.log('| where timestamp > ago(24h)');
      console.log('| project timestamp, message, severityLevel');
      console.log('| order by timestamp desc');
      console.log('');
      process.exit(1);
    }

    const data = (await response.json()) as any;
    const tables = data.tables || [];

    if (tables.length === 0 || !tables[0].rows || tables[0].rows.length === 0) {
      console.log('⚠️  No agent traces found in Application Insights (last 24 hours)');
      console.log('');
      console.log('This could mean:');
      console.log('   • Agent has not run yet');
      console.log('   • Traces are still being ingested (may take 1-5 minutes)');
      console.log('   • Tracing may not be properly configured');
      console.log('');
      console.log('To troubleshoot:');
      console.log('1. Run a test: npm run test:real-agent');
      console.log('2. Wait 1-5 minutes for traces to appear');
      console.log('3. Run this command again');
      console.log('');
      return;
    }

    const rows = tables[0].rows;
    console.log(`✅ Found ${rows.length} agent trace(s):`);
    console.log('');
    console.log('═════════════════════════════════════════════════════════════════════════════════');

    rows.forEach((row: any[], index: number) => {
      const timestamp = row[0];
      const message = row[1];
      const severity = row[2];
      const agentId = row[3];
      const duration = row[4];
      const promptLength = row[5];
      const responseLength = row[6];

      console.log(`\n${index + 1}. ${new Date(timestamp).toLocaleString()}`);
      console.log(`   Severity: ${severity}`);
      console.log(`   Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      
      if (agentId) console.log(`   Agent ID: ${agentId}`);
      if (duration) console.log(`   Duration: ${duration}ms`);
      if (promptLength) console.log(`   Prompt Length: ${promptLength} chars`);
      if (responseLength) console.log(`   Response Length: ${responseLength} chars`);
    });

    console.log('');
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Agent usage confirmed in Application Insights!');
    console.log('');
    console.log('💡 Tips:');
    console.log('   • Traces appear within 1-5 minutes of agent invocation');
    console.log('   • Check Azure Portal for detailed trace information');
    console.log('   • Each trace shows agent ID, duration, and response details');
    console.log('');

  } catch (error) {
    const err = error as Error;
    console.error(`❌ ERROR: ${err.message}`);
    
    if (err.message.includes('az')) {
      console.error('   Azure CLI error - ensure you are logged in: az login');
    }
    
    process.exit(1);
  }
}

queryAppInsights();
