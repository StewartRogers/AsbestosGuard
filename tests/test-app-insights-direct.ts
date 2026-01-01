/**
 * Direct test to verify Application Insights connection string is valid
 * by checking if we can query the Application Insights REST API directly
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              Direct Application Insights Connection Test                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

if (!connString) {
  console.error('❌ ERROR: APPLICATIONINSIGHTS_CONNECTION_STRING not set');
  process.exit(1);
}

console.log('✅ Connection string found');
console.log('');

try {
  // Parse connection string to extract instrumentation key
  const parts = connString.split(';');
  let instrumentationKey = '';
  
  for (const part of parts) {
    if (part.startsWith('InstrumentationKey=')) {
      instrumentationKey = part.substring('InstrumentationKey='.length);
      break;
    }
  }
  
  if (!instrumentationKey) {
    console.error('❌ ERROR: Could not extract InstrumentationKey from connection string');
    process.exit(1);
  }
  
  console.log('📊 Extracted Instrumentation Key: ' + instrumentationKey.substring(0, 8) + '...');
  console.log('');
  
  // Initialize tracing with useAzureMonitor
  console.log('📦 Importing @azure/monitor-opentelemetry...');
  const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
  
  console.log('⚙️  Initializing Azure Monitor...');
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: connString,
      storageDirectory: process.cwd() + '/.trace-storage'
    }
  });
  
  console.log('✅ Azure Monitor initialized');
  console.log('');
  
  // Create and send a test span
  console.log('🔧 Getting OpenTelemetry tracer...');
  const { trace } = await import('@opentelemetry/api');
  const tracer = trace.getTracer('test-direct-trace');
  
  console.log('📝 Creating test span...');
  const span = tracer.startSpan('test-direct-span');
  span.setAttribute('testrun', true);
  span.setAttribute('timestamp', new Date().toISOString());
  span.addEvent('test-span-created');
  span.end();
  
  console.log('✅ Test span created and ended');
  console.log('');
  
  console.log('⏳ Waiting 8 seconds for export...');
  for (let i = 8; i >= 1; i--) {
    if (i < 8) {
      process.stdout.write('\x1b[1A\x1b[K');
    }
    console.log('⏳ Waiting ' + i + ' seconds for export...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ Complete!');
  console.log('');
  
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('🔍 Verifying data arrival in Application Insights...');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  
  // Try querying Application Insights via REST API
  const { execSync } = await import('child_process');
  
  try {
    console.log('🔑 Getting Azure access token...');
    const tokenCmd = 'az account get-access-token --resource https://api.applicationinsights.io --query accessToken -o tsv';
    const token = execSync(tokenCmd, { encoding: 'utf-8' }).trim();
    
    if (token) {
      console.log('✅ Got access token');
      console.log('');
      
      // Query Application Insights for recent traces
      console.log('📋 Querying Application Insights for traces...');
      const resourceId = '/subscriptions/' + (process.env.AZURE_SUBSCRIPTION_ID || 'unknown') + '/resourceGroups/' + (process.env.AZURE_RESOURCE_GROUP || 'unknown') + '/providers/microsoft.insights/components/' + (process.env.APPINSIGHTS_NAME || 'unknown');
      
      const query = `traces | where timestamp > ago(2m) | project timestamp, message, customDimensions | limit 10`;
      const encodedQuery = encodeURIComponent(query);
      
      const response = await fetch(
        `https://api.applicationinsights.io/v1/apps/${instrumentationKey}/query?query=${encodedQuery}`,
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.tables && data.tables[0] && data.tables[0].rows.length > 0) {
        console.log('✅ FOUND ' + data.tables[0].rows.length + ' traces in Application Insights!');
        console.log('');
        console.log('Recent traces:');
        for (const row of data.tables[0].rows.slice(0, 3)) {
          console.log('  - ' + row[0] + ': ' + row[1]);
        }
      } else {
        console.log('⚠️  No traces found in Application Insights yet');
        console.log('    Data may still be ingesting (can take 1-5 minutes)');
      }
    }
  } catch (e) {
    console.log('ℹ️  Could not verify via API - check manually in Azure Portal');
  }
  
  console.log('');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('📝 Next steps:');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('1. Go to Azure Portal > Application Insights resource');
  console.log('2. Click "Logs" in the left menu');
  console.log('3. Run query: traces | where timestamp > ago(10m) | limit 50');
  console.log('4. Or wait 2-5 minutes and run: npm run check:app-insights-status');
  console.log('');
  
} catch (error) {
  const err = error as Error;
  console.error('❌ ERROR:', err.message);
  console.error('');
  
  if (err.message.includes('Cannot find module')) {
    console.error('Missing @azure/monitor-opentelemetry package');
    console.error('Install with: npm install @azure/monitor-opentelemetry');
    console.error('');
  }
  
  if (err.message.includes('connection string') || err.message.includes('invalid')) {
    console.error('Connection string appears to be invalid');
    console.error('Verify it in Azure Portal:');
    console.error('1. Go to Application Insights resource');
    console.error('2. Click "Properties"');
    console.error('3. Copy the full Connection String');
    console.error('4. Paste into .env.local as APPLICATIONINSIGHTS_CONNECTION_STRING');
  }
  
  process.exit(1);
}
