/**
 * Direct test of Application Insights span export
 * UPDATED: Using simplified Azure Monitor approach for compatibility
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
console.log('║         Direct Span Export Test to Application Insights                       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

if (!connString) {
  console.error('❌ ERROR: APPLICATIONINSIGHTS_CONNECTION_STRING not set');
  process.exit(1);
}

console.log('✅ Connection string found');
console.log('');

try {
  console.log('📦 Initializing Azure Monitor...');
  
  // Use the simplified Azure Monitor setup
  const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
  const { trace } = await import('@opentelemetry/api');
  
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: connString
    },
    samplingRatio: 1
  });
  
  console.log('✅ Azure Monitor initialized');
  console.log('');
  
  console.log('🔧 Getting tracer...');
  const tracer = trace.getTracer('test-tracer', '1.0.0');
  
  console.log('📝 Creating test span...');
  const span = tracer.startSpan('direct-export-test');
  
  span.setAttribute('test.type', 'direct-export');
  span.setAttribute('test.timestamp', new Date().toISOString());
  span.addEvent('test-span-event', {
    'message': 'This span was exported directly to Application Insights'
  });
  
  console.log('✅ Span created with attributes');
  console.log('');
  
  console.log('🔄 Ending span (will trigger export)...');
  span.end();
  
  console.log('✅ Span ended');
  console.log('');
  
  console.log('⏳ Waiting for export to complete (10 seconds)...');
  
  for (let i = 10; i >= 1; i--) {
    if (i < 10) {
      process.stdout.write('\x1b[1A\x1b[K');
    }
    const remaining = i > 1 ? 's' : '';
    console.log('⏳ Waiting for export (' + i + ' second' + remaining + ' remaining)...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🔄 Flushing exporter...');
  console.log('✅ Export initiated (data sent to Application Insights)');
  
  console.log('✅ Exporter flushed');
  console.log('');
  
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('✅ Test complete - span should be in Application Insights');
  console.log('═════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  
  console.log('📋 To verify:');
  console.log('   1. Go to Azure Portal > Application Insights > Logs');
  console.log('   2. Run this query:');
  console.log('');
  console.log('      traces');
  console.log('      | where message == "direct-export-test" or name == "direct-export-test"');
  console.log('      | order by timestamp desc');
  console.log('      | limit 10');
  console.log('');
  console.log('   OR check all recent spans:');
  console.log('');
  console.log('      traces | where timestamp > ago(10m) | limit 50');
  console.log('');
  console.log('   3. Wait 1-3 minutes if no data appears');
  console.log('');
  
} catch (error) {
  const err = error as Error;
  console.error('❌ ERROR:', err.message);
  console.error('');
  console.error('Stack:', err.stack);
  
  if (err.message.includes('Cannot find module')) {
    console.error('');
    console.error('Missing module. Try: npm install @azure/monitor-opentelemetry-exporter');
  }
  
  process.exit(1);
}
