/**
 * Diagnostic: Parse and validate Application Insights connection string
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
console.log('║            Application Insights Connection String Validator                   ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

if (!connString) {
  console.error('❌ APPLICATIONINSIGHTS_CONNECTION_STRING not set in .env.local');
  process.exit(1);
}

console.log('📝 Connection string (first 50 chars): ' + connString.substring(0, 50) + '...');
console.log('');

// Parse connection string
const parts = connString.split(';').filter(p => p.trim());
const parsed: Record<string, string> = {};

for (const part of parts) {
  const [key, ...valueParts] = part.split('=');
  const value = valueParts.join('=');
  parsed[key.trim()] = value.trim();
}

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                       Parsed Connection String                                ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

let isValid = true;

// Check for required components
const requiredKeys = ['InstrumentationKey', 'IngestionEndpoint'];
for (const key of requiredKeys) {
  if (parsed[key]) {
    console.log('✅ ' + key + ':');
    console.log('   ' + parsed[key].substring(0, 60) + (parsed[key].length > 60 ? '...' : ''));
  } else {
    console.log('❌ MISSING: ' + key);
    isValid = false;
  }
}

console.log('');

if (isValid) {
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('✅ Connection string appears valid');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  
  console.log('📊 Application Insights Details:');
  console.log('   InstrumentationKey: ' + parsed['InstrumentationKey']);
  console.log('   IngestionEndpoint: ' + parsed['IngestionEndpoint']);
  console.log('');
  
  console.log('🔍 Next steps:');
  console.log('   1. Go to Azure Portal');
  console.log('   2. Find your Application Insights resource');
  console.log('   3. Click Properties to verify this Instrumentation Key matches');
  console.log('   4. If they don\'t match, copy the correct connection string from Portal');
  console.log('');
} else {
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('❌ Connection string is INVALID - Missing required components');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  
  console.log('📝 Correct format should be:');
  console.log('   InstrumentationKey=<your-key>;IngestionEndpoint=<your-endpoint>/');
  console.log('');
  
  console.log('🔍 To get correct connection string:');
  console.log('   1. Go to Azure Portal > Application Insights resource');
  console.log('   2. Click "Properties" in the left sidebar');
  console.log('   3. Copy the full "Connection String" value');
  console.log('   4. Paste into .env.local as:');
  console.log('      APPLICATIONINSIGHTS_CONNECTION_STRING=<pasted-value>');
  console.log('');
  
  process.exit(1);
}
