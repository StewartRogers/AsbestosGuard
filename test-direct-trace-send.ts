/**
 * Direct test of Application Insights span export using the exporter directly
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
  console.log('📦 Importing OpenTelemetry SDK modules...');
  
  // Use the SDK components
  const { SimpleSpanProcessor, BasicTracerProvider } = await import('@opentelemetry/sdk-trace-base');
  const { AzureMonitorTraceExporter } = await import('@azure/monitor-opentelemetry-exporter');
  const { trace } = await import('@opentelemetry/api');
  
  console.log('✅ Imports successful');
  console.log('');
  
  console.log('⚙️  Creating Azure Monitor Trace Exporter...');
  
  const exporter = new AzureMonitorTraceExporter({
    connectionString: connString
  });
  
  console.log('✅ Exporter created');
  console.log('');
  
  console.log('📊 Creating tracer provider (no custom resource)...');
  
  const tracerProvider = new BasicTracerProvider();
  
  // Add exporter as span processor
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  
  // Register as global
  trace.setGlobalTracerProvider(tracerProvider);
  
  console.log('✅ Tracer provider configured');
  console.log('');
  
  console.log('🔧 Getting tracer...');
  const tracer = trace.getTracer('test-tracer', '1.0.0');
  
  console.log('📝 Creating test span...');
  const ctx = tracer.startSpan('direct-export-test');
  
  ctx.setAttribute('test.type', 'direct-export');
  ctx.setAttribute('test.timestamp', new Date().toISOString());
  ctx.addEvent('test-span-event', {
    'message': 'This span was exported directly to Application Insights'
  });
  
  console.log('✅ Span created with attributes');
  console.log('');
  
  console.log('🔄 Ending span (will trigger export)...');
  ctx.end();
  
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
  
  // Force flush to ensure all data is sent
  await exporter.forceFlush();
  
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
