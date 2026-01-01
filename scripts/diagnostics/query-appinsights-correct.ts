/**
 * Query Application Insights using the correct Resource ID endpoint
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (!connString) {
  console.error('❌ No connection string');
  process.exit(1);
}

const keyMatch = connString.match(/InstrumentationKey=([^;]+)/);
const instrKey = keyMatch ? keyMatch[1] : null;

if (!instrKey) {
  console.error('❌ Could not extract key');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║            Query Application Insights with Correct Endpoint                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

try {
  // Get the resource ID
  console.log('📍 Getting Application Insights Resource ID...');
  const resourceId = execSync(
    `az monitor app-insights list --query "[?properties.InstrumentationKey=='${instrKey}'].id" -o tsv`,
    { encoding: 'utf-8' }
  ).trim();

  if (!resourceId) {
    console.error('❌ Could not find Application Insights resource');
    process.exit(1);
  }

  console.log('✅ Found: ' + resourceId);
  console.log('');

  // Get access token
  const token = execSync(
    'az account get-access-token --resource "https://management.azure.com" --query accessToken -o tsv',
    { encoding: 'utf-8' }
  ).trim();

  console.log('🔑 Got access token');
  console.log('');

  // Query using the correct endpoint
  console.log('📋 Querying with correct endpoint...');
  const query = 'traces | where timestamp > ago(10m) | limit 50';
  const encodedQuery = encodeURIComponent(query);
  
  // The correct endpoint is /api/query on the Azure Monitor service
  const url = `https://api.monitor.azure.com${resourceId}/providers/microsoft.insights/query?api-version=2021-08-01&query=${encodedQuery}`;
  
  console.log('URL: ' + url.substring(0, 120) + '...');
  console.log('');

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: query
    })
  });

  console.log('Status: ' + response.status);
  
  if (response.status === 200 || response.status === 400) {
    const data = await response.json();
    
    if (data.tables && data.tables[0]) {
      const rows = data.tables[0].rows || [];
      if (rows.length > 0) {
        console.log('✅ FOUND ' + rows.length + ' traces!');
        console.log('');
        for (const row of rows.slice(0, 5)) {
          console.log('  ' + JSON.stringify(row));
        }
      } else {
        console.log('⚠️  Query executed but no rows returned');
      }
    } else {
      console.log('Response: ' + JSON.stringify(data).substring(0, 200));
    }
  } else {
    console.log('Response: ' + (await response.text()).substring(0, 300));
  }
  
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
}
