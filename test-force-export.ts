/**
 * Test: Force immediate export of a span to Application Insights
 * Using @azure/monitor-opentelemetry with explicit flushing
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const connString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║            Azure Monitor OpenTelemetry - Forced Export Test                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

if (!connString) {
  console.error('❌ No connection string');
  process.exit(1);
}

try {
  // Import FIRST before anything else traces
  console.log('📦 Initializing @azure/monitor-opentelemetry...');
  const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
  const monitor = useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: connString
    }
  });
  
  console.log('✅ Azure Monitor initialized');
  console.log('');
  
  // Get global tracer
  const { trace } = await import('@opentelemetry/api');
  const tracer = trace.getTracer('force-export-test', '1.0');
  
  // Create and complete span
  console.log('📝 Creating span...');
  const span = tracer.startSpan('force-export-span');
  span.setAttribute('forced', true);
  span.setAttribute('when', new Date().toISOString());
  span.end();
  console.log('✅ Span ended');
  console.log('');
  
  // Get the tracer provider and flush it
  console.log('🔄 Getting tracer provider...');
  const tracerProvider = trace.getTracerProvider() as any;
  
  if (tracerProvider && typeof tracerProvider.forceFlush === 'function') {
    console.log('💾 Forcing flush of tracer provider...');
    await tracerProvider.forceFlush();
    console.log('✅ Tracer provider flushed');
  } else {
    console.log('⚠️  TracerProvider does not have forceFlush method');
    console.log('   Type: ' + (tracerProvider?.constructor?.name || 'unknown'));
  }
  
  console.log('');
  console.log('⏳ Waiting 5 seconds for background export...');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('✅ Test complete');
  console.log('');
  console.log('Check Application Insights Logs for span named "force-export-span"');
  
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  console.error('Stack:', (error as Error).stack?.split('\n').slice(0, 5).join('\n'));
}
