/**
 * Debug the Application Insights REST API response
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

console.log('Instrumentation Key: ' + instrKey);
console.log('');

try {
  const token = execSync(
    'az account get-access-token --resource "https://api.applicationinsights.io" --query accessToken -o tsv',
    { encoding: 'utf-8' }
  ).trim();

  console.log('📋 Raw API Response Debug:');
  console.log('');
  
  // Try exact query from Portal
  const query = 'traces | where timestamp > ago(10m) | limit 50';
  const encodedQuery = encodeURIComponent(query);
  
  console.log('Query: ' + query);
  console.log('Encoded: ' + encodedQuery);
  console.log('');
  
  const url = `https://api.applicationinsights.io/v1/apps/${instrKey}/query?query=${encodedQuery}`;
  
  console.log('URL: ' + url.substring(0, 100) + '...');
  console.log('');
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status: ' + response.status);
  console.log('');
  
  const data = await response.json();
  
  console.log('Full Response:');
  console.log(JSON.stringify(data, null, 2));
  
} catch (error) {
  console.error('Error:', (error as Error).message);
}
