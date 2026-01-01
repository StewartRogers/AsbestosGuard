/**
 * Search for "test-span-created" specifically in Application Insights
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║          Searching for "test-span-created" in Application Insights             ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

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

try {
  console.log('🔑 Getting access token...');
  const token = execSync(
    'az account get-access-token --resource "https://api.applicationinsights.io" --query accessToken -o tsv',
    { encoding: 'utf-8' }
  ).trim();

  console.log('✅ Token acquired');
  console.log('');

  // Search in traces table using same query that works in Portal
  console.log('📋 Searching traces table (last 10 minutes, limit 50)...');
  let query = encodeURIComponent('traces | where timestamp > ago(10m) | limit 50');
  let url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${query}`;
  
  let response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  let data = (await response.json()) as any;
  let rows = data.tables?.[0]?.rows || [];

  if (rows.length > 0) {
    console.log(`✅ FOUND ${rows.length} entries!`);
    console.log('');
    console.log('Recent traces:');
    for (const row of rows.slice(0, 5)) {
      console.log(`  [${row[0]}] ${row[1]}`);
    }
  } else {
    console.log('❌ No results - check portal manually');
  }

  console.log('');
  console.log('📋 Searching ALL data tables (union)...');
  query = encodeURIComponent('union withoutnulls traces, customMetrics, customEvents | where message contains "test-span" or name contains "test-span" or message contains "created" | project timestamp, message, name | limit 20');
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
    console.log(`✅ FOUND ${rows.length} entries in union query:`);
    for (const row of rows.slice(0, 10)) {
      console.log(`   ${row[0]}: ${row[1]}`);
    }
  } else {
    console.log('❌ No results in union query');
  }

  console.log('');
  console.log('📊 Checking requests table for recent data...');
  query = encodeURIComponent('requests | where timestamp > ago(10m) | project timestamp, name, resultCode | limit 10');
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
    console.log(`✅ Found ${rows.length} recent requests`);
  } else {
    console.log('⚠️  No requests found');
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('Query complete - check results above');
  
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
}
