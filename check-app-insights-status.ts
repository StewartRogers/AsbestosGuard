/**
 * Diagnostic tool to check what traces are being sent to Application Insights
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

async function diagnosticCheck() {
  const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connString) {
    console.error('❌ ERROR: APPLICATIONINSIGHTS_CONNECTION_STRING not set in .env.local');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          Application Insights - Diagnostic Trace Check                         ║');
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

    console.log('📊 Running diagnostic queries...');
    console.log('');

    // Query 1: Check if ANY traces exist
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('1. Checking for ANY traces in the last 24 hours...');
    console.log('═════════════════════════════════════════════════════════════════════════════════');

    let query = encodeURIComponent('traces | where timestamp > ago(24h) | count');
    let url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${query}`;
    
    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let data = (await response.json()) as any;
    let rows = data.tables?.[0]?.rows || [];
    const traceCount = rows[0]?.[0] || 0;

    if (traceCount > 0) {
      console.log(`✅ Found ${traceCount} total traces`);
    } else {
      console.log('⚠️  No traces found - Application Insights may not be receiving data');
    }
    console.log('');

    // Query 2: Check for logs
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('2. Checking for ANY custom logs...');
    console.log('═════════════════════════════════════════════════════════════════════════════════');

    query = encodeURIComponent('customMetrics | where timestamp > ago(24h) | count');
    url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${query}`;
    
    response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    data = (await response.json()) as any;
    rows = data.tables?.[0]?.rows || [];
    const metricCount = rows[0]?.[0] || 0;

    console.log(`Found ${metricCount} custom metrics`);
    console.log('');

    // Query 3: Sample recent traces
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('3. Sample of recent traces (last 10)...');
    console.log('═════════════════════════════════════════════════════════════════════════════════');

    query = encodeURIComponent(`
traces
| where timestamp > ago(24h)
| project timestamp, message, severityLevel, cloud_RoleName
| order by timestamp desc
| limit 10
`);
    url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${query}`;
    
    response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    data = (await response.json()) as any;
    rows = data.tables?.[0]?.rows || [];

    if (rows.length > 0) {
      console.log(`Found ${rows.length} recent traces:`);
      console.log('');
      rows.forEach((row: any[], idx: number) => {
        const timestamp = new Date(row[0]).toLocaleString();
        const message = row[1];
        const severity = row[2];
        const roleName = row[3];
        
        console.log(`  ${idx + 1}. [${timestamp}] ${severity || 'Info'}`);
        console.log(`     Role: ${roleName || 'N/A'}`);
        console.log(`     Msg: ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`);
      });
    } else {
      console.log('No recent traces found');
    }
    console.log('');

    // Query 4: Check for foundryAgentClient traces
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('4. Searching for foundryAgentClient traces...');
    console.log('═════════════════════════════════════════════════════════════════════════════════');

    query = encodeURIComponent(`
traces
| where timestamp > ago(24h)
| where message contains "foundryAgentClient" or message contains "Agent" or message contains "bridge"
| project timestamp, message, severityLevel
| order by timestamp desc
| limit 20
`);
    url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${query}`;
    
    response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    data = (await response.json()) as any;
    rows = data.tables?.[0]?.rows || [];

    if (rows.length > 0) {
      console.log(`✅ Found ${rows.length} agent-related traces!`);
      console.log('');
      rows.forEach((row: any[], idx: number) => {
        const timestamp = new Date(row[0]).toLocaleString();
        const message = row[1];
        const severity = row[2];
        
        console.log(`  ${idx + 1}. [${timestamp}]`);
        console.log(`     Severity: ${severity}`);
        console.log(`     Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      });
    } else {
      console.log('❌ No agent-related traces found');
      console.log('');
      console.log('Possible causes:');
      console.log('   1. Traces have not been sent yet (may take 1-5 minutes)');
      console.log('   2. Tracing is not initialized in the application');
      console.log('   3. Agent has not been invoked since adding App Insights connection');
    }
    console.log('');

    // Summary and recommendations
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('📋 SUMMARY');
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    
    if (traceCount === 0) {
      console.log('⚠️  No data in Application Insights - it may not be properly connected');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify APPLICATIONINSIGHTS_CONNECTION_STRING is correct in .env.local');
      console.log('2. Make sure the connection string includes InstrumentationKey');
      console.log('3. Run a test: npm run test:real-agent');
      console.log('4. Wait 2-5 minutes for data to arrive');
      console.log('5. Run this diagnostic again: npm run check:app-insights-status');
    } else if (rows.length > 0) {
      console.log('✅ Application Insights is receiving traces and agent invocations are logged!');
      console.log('');
      console.log('To see more details, run: npm run check:agent-traces');
    } else {
      console.log('⚠️  Application Insights is receiving data but agent traces are not found');
      console.log('');
      console.log('This might mean:');
      console.log('1. Agent invocation tracing is not enabled');
      console.log('2. Traces are being sent but not with the expected format');
      console.log('3. Run: npm run test:real-agent to generate new traces');
      console.log('4. Wait 2-5 minutes and run this diagnostic again');
    }
    console.log('');

  } catch (error) {
    const err = error as Error;
    console.error(`❌ ERROR: ${err.message}`);
    process.exit(1);
  }
}

diagnosticCheck();
