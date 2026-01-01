/**
 * Test script to verify tracing is properly initialized
 * Run this before running agent tests
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                      Tracing Initialization Check                             ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Could not load .env.local');
  process.exit(1);
}

const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

console.log('1️⃣  Configuration Status:');
console.log(`   APPLICATIONINSIGHTS_CONNECTION_STRING: ${connString ? '✅ SET' : '❌ NOT SET'}`);

if (connString) {
  const keyMatch = connString.match(/InstrumentationKey=([^;]+)/);
  const instrKey = keyMatch ? keyMatch[1] : null;
  if (instrKey) {
    console.log(`   Instrumentation Key: ${instrKey.substring(0, 8)}...${instrKey.substring(instrKey.length - 4)}`);
  }
}
console.log('');

console.log('2️⃣  Importing foundryAgentClient (will initialize tracing)...');
console.log('');

try {
  // This import will trigger tracing setup
  const { askAgent } = await import('./services/foundryAgentClient.js');
  
  console.log('✅ foundryAgentClient imported successfully');
  console.log('');
  console.log('3️⃣  Tracing Status:');
  
  if (connString) {
    console.log('   ✅ Azure Monitor OpenTelemetry should be initialized');
    console.log('   ✅ Traces will be sent to Application Insights');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Run a test: npm run test:real-agent');
    console.log('   2. Wait 1-5 minutes for traces to appear');
    console.log('   3. Check traces: npm run check:app-insights-status');
  } else {
    console.log('   ⚠️  Tracing is DISABLED - no connection string set');
    console.log('');
    console.log('💡 To enable tracing:');
    console.log('   1. Add APPLICATIONINSIGHTS_CONNECTION_STRING to .env.local');
    console.log('   2. Get it from Azure Portal > Application Insights > Properties');
    console.log('   3. Run this check again to verify');
  }
  
  console.log('');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  
} catch (error) {
  const err = error as Error;
  console.error('❌ Failed to import foundryAgentClient:');
  console.error(`   ${err.message}`);
  
  if (err.message.includes('@azure/monitor-opentelemetry')) {
    console.error('');
    console.error('Missing dependency detected. Install with:');
    console.error('   npm install @azure/monitor-opentelemetry');
  }
  
  process.exit(1);
}
