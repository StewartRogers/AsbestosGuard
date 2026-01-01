/**
 * Initialize Azure Monitor OpenTelemetry Tracing
 * This must be imported FIRST before other Azure modules
 * Protected to run only once - safe to import multiple times
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first
const envPath = path.resolve(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

// Track if already initialized globally to prevent duplicate registration
const globalAny = globalThis as any;

console.log('[tracing-setup] Loading OpenTelemetry tracing...');

// Only initialize if not already done
if (!globalAny._azureMonitorInitialized && connectionString) {
  try {
    // Import Azure Monitor components - use the simpler useAzureMonitor wrapper
    const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
    
    // Mark as initialized BEFORE calling useAzureMonitor to prevent race conditions
    globalAny._azureMonitorInitialized = true;
    
    // Use useAzureMonitor which configures everything for us
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: connectionString
      },
      // Export spans immediately for faster visibility
      traceExportIntervalMillis: 500,
      metricExportIntervalMillis: 500,
      samplingRatio: 1
    });
    
    console.log('[tracing-setup] ✅ Azure Monitor OpenTelemetry initialized');
    console.log('[tracing-setup]    Connection: ' + connectionString.substring(0, 45) + '...');
    console.log('[tracing-setup]    Export interval: 500ms');
    
    // Create a test span to verify tracing is working
    const { trace } = await import('@opentelemetry/api');
    const testTracer = trace.getTracer('tracing-setup-test');
    const testSpan = testTracer.startSpan('tracing-initialization-test');
    console.log('[tracing-setup]    Test span started');
    testSpan.setAttribute('initialized', true);
    console.log('[tracing-setup]    Test span attribute set');
    testSpan.end();
    console.log('[tracing-setup]    Test span ended');
    console.log('[tracing-setup]    Test span created to verify tracing');
  } catch (error) {
    const err = error as Error;
    console.error('[tracing-setup] ❌ Failed to initialize:', err.message);
  }
} else if (globalAny._azureMonitorInitialized) {
  console.log('[tracing-setup] ✅ Already initialized (skipping)');
} else {
  console.warn('[tracing-setup] ⚠️  APPLICATIONINSIGHTS_CONNECTION_STRING not set');
}

export {};
