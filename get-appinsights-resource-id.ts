/**
 * Get the correct Application Insights Resource ID and workspace ID for API queries
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
console.log('║         Getting Application Insights Resource ID and Workspace ID              ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

if (!connString) {
  console.error('❌ No connection string');
  process.exit(1);
}

const keyMatch = connString.match(/InstrumentationKey=([^;]+)/);
const instrKey = keyMatch ? keyMatch[1] : null;

if (!instrKey) {
  console.error('❌ Could not extract Instrumentation Key');
  process.exit(1);
}

console.log('✅ Found Instrumentation Key: ' + instrKey.substring(0, 20) + '...');
console.log('');

try {
  console.log('🔍 Searching for Application Insights resource with this Instrumentation Key...');
  console.log('');
  
  // Get list of all Application Insights resources
  const cmd = `az monitor app-insights component show --query "id" -o json --query "[0].id" 2>/dev/null || az monitor app-insights list --query "[?properties.InstrumentationKey=='${instrKey}'].{id:id,name:name,resourceGroup:resourceGroup}" -o json`;
  
  console.log('Running Azure CLI to find resource...');
  const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  
  console.log('Result:');
  console.log(result);
  console.log('');
  
  // Try parsing the result
  try {
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const resource = parsed[0];
      console.log('✅ Found Application Insights resource:');
      console.log('   Name: ' + (resource.name || 'unknown'));
      console.log('   Resource Group: ' + (resource.resourceGroup || 'unknown'));
      console.log('   ID: ' + (resource.id || 'unknown'));
      console.log('');
      
      if (resource.id) {
        console.log('📌 Use this for API queries: ' + resource.id);
      }
    } else {
      console.log('⚠️  Could not parse resource list');
    }
  } catch (e) {
    console.log('ℹ️  Response was not JSON, checking if it\'s a resource ID...');
    if (result.includes('/Microsoft.Insights/components/')) {
      console.log('✅ Found resource ID: ' + result);
      console.log('');
      console.log('📌 Use this for API queries: ' + result);
    }
  }
  
  console.log('');
  console.log('If the above doesn\'t show a resource ID, manually go to Azure Portal:');
  console.log('1. Search for "Application Insights"');
  console.log('2. Find your resource');
  console.log('3. Click "Properties"');
  console.log('4. Copy the "Resource ID" value');
  console.log('5. Use it in the API endpoint');
  
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  console.log('');
  console.log('Alternative: Use the Azure Portal to find Resource ID:');
  console.log('1. Go to Azure Portal > Application Insights resource');
  console.log('2. Click "Properties" (left sidebar)');
  console.log('3. Copy "Resource ID"');
  console.log('4. It should be in format: /subscriptions/{subscription}/resourceGroups/{rg}/providers/microsoft.insights/components/{name}');
}
