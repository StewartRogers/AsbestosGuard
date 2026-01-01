/**
 * Query Application Insights with manually specified Resource ID
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║            Query Application Insights - Using Resource ID                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// The resource ID we found earlier
const resourceId = '/subscriptions/cf1a336f-d853-494e-8202-9bf4f16336e0/resourceGroups/my-webapp-rg/providers/microsoft.insights/components/AsbestosGuard';

console.log('📍 Using Resource ID:');
console.log('   ' + resourceId);
console.log('');

try {
  // Get access token for management API
  console.log('🔑 Getting access token for Azure Management...');
  const token = execSync(
    'az account get-access-token --resource "https://management.azure.com" --query accessToken -o tsv',
    { encoding: 'utf-8' }
  ).trim();

  console.log('✅ Got token');
  console.log('');

  // Query using POST to the correct endpoint
  console.log('📋 Querying Application Insights...');
  
  const query = 'traces | where timestamp > ago(10m) | limit 50';
  
  // The CORRECT endpoint for querying logs
  const url = `https://management.azure.com${resourceId}/query?api-version=2018-04-20`;
  
  console.log('Endpoint: ' + url.substring(0, 100) + '...');
  console.log('Query: ' + query);
  console.log('');

  const response = await fetch(url, {
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
  
  const responseText = await response.text();
  console.log('');

  if (response.status === 200) {
    try {
      const data = JSON.parse(responseText);
      
      if (data.tables && data.tables[0]) {
        const rows = data.tables[0].rows || [];
        console.log('✅ FOUND ' + rows.length + ' rows!');
        console.log('');
        
        if (rows.length > 0) {
          console.log('Sample traces:');
          for (const row of rows.slice(0, 3)) {
            console.log('  ' + JSON.stringify(row));
          }
        }
      } else {
        console.log('Response structure:');
        console.log(JSON.stringify(data, null, 2).substring(0, 500));
      }
    } catch (e) {
      console.log('Response (not JSON):');
      console.log(responseText.substring(0, 300));
    }
  } else if (response.status === 404) {
    console.log('❌ 404 - Resource endpoint not found');
    console.log('');
    console.log('This suggests we need a different endpoint. Let me try /query?api-version=2023-01-01');
    console.log('');
    
    // Try alternative endpoint
    const url2 = `https://management.azure.com${resourceId}/query?api-version=2023-01-01`;
    const response2 = await fetch(url2, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        timespan: 'PT10M'
      })
    });
    
    console.log('Alternative endpoint status: ' + response2.status);
    const text2 = await response2.text();
    if (response2.status === 200) {
      console.log('✅ SUCCESS with alternative endpoint!');
      console.log(text2.substring(0, 500));
    } else {
      console.log('Response: ' + text2.substring(0, 300));
    }
  } else {
    console.log('Response: ' + responseText.substring(0, 300));
  }
  
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
}
