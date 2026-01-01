/**
 * Simple test: send one span to Application Insights
 * (Same approach as test-app-insights-direct.ts which works)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('Simple Application Insights Test (Using useAzureMonitor)');
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('');

if (!connString) {
  console.error('❌ Connection string not found');
  process.exit(1);
}

console.log('✅ Connection string found');
console.log('');

// Initialize tracing EXACTLY like test-app-insights-direct.ts
console.log('📦 Importing @azure/monitor-opentelemetry...');
const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');

console.log('⚙️  Initializing Azure Monitor...');
const sdk = useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: connString,
    storageDirectory: process.cwd() + '/.trace-storage'
  },
  traceExportIntervalMillis: 500
});

console.log('✅ Azure Monitor initialized');
console.log('');

// Get tracer
console.log('🔧 Getting tracer...');
const { trace } = await import('@opentelemetry/api');
const tracer = trace.getTracer('simple-test');

console.log('📝 Creating span...');
const span = tracer.startSpan('simple-test-span');

span.setAttribute('test', true);
span.setAttribute('timestamp', new Date().toISOString());
span.addEvent('test-event', { message: 'Simple test span' });

console.log('✅ Span created');
console.log('');

console.log('Ending span...');
span.end();

console.log('✅ Span ended');
console.log('');

console.log('Waiting 8 seconds for export...');
await new Promise(r => setTimeout(r, 8000));

console.log('✅ Span export wait complete');
console.log('');

// Shutdown the SDK to ensure all spans are flushed
console.log('Shutting down Azure Monitor SDK...');
if (sdk && typeof sdk.shutdown === 'function') {
  await sdk.shutdown();
  console.log('✅ SDK shutdown complete');
} else {
  console.log('⚠️  SDK shutdown not available');
}

console.log('');
console.log('Check Application Insights Logs:');
console.log('  Query: traces | where timestamp > ago(10m) | limit 50');
