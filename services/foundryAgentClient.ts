import { DefaultAzureCredential } from '@azure/identity';
import { trace, SpanStatusCode } from '@opentelemetry/api';

type MessageContent = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const AI_SCOPE = 'https://ai.azure.com/.default';

// Initialize OpenTelemetry tracing
let tracingInitialized = false;

function initializeTracing() {
  if (tracingInitialized) return;
  
  try {
    // Check if Application Insights connection string is available
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    
    if (connectionString) {
      // Dynamically import and configure Azure Monitor
      import('@azure/monitor-opentelemetry').then(({ useAzureMonitor }) => {
        useAzureMonitor({
          azureMonitorExporterOptions: {
            connectionString: connectionString
          }
        });
        console.log('[foundryAgentClient] ✅ OpenTelemetry tracing initialized with Azure Monitor');
      }).catch(err => {
        console.warn('[foundryAgentClient] Failed to initialize Azure Monitor tracing:', err.message);
      });
    } else {
      console.warn('[foundryAgentClient] ⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not set - traces will not be sent to Azure');
    }
    
    tracingInitialized = true;
  } catch (error) {
    console.warn('[foundryAgentClient] Failed to initialize tracing:', (error as Error).message);
  }
}

// Initialize tracing on module load
initializeTracing();

// Get tracer for creating spans
const tracer = trace.getTracer('azure-ai-foundry-agent-client', '1.0.0');

function getProjectEndpoint(): string {
  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
  if (!endpoint) {
    throw new Error('Missing AZURE_AI_FOUNDRY_PROJECT_ENDPOINT. Make sure it is set in .env.local or environment.');
  }
  const clean = endpoint.replace(/\/$/, '');
  console.log(`[foundryAgentClient] Using Foundry endpoint: ${clean}`);
  return clean;
}

async function getAuthToken(): Promise<string> {
  if (process.env.AGENT_TOKEN) return process.env.AGENT_TOKEN as string;
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken(AI_SCOPE);
  if (!token?.token) throw new Error('Failed to acquire Azure AI Foundry token');
  return token.token;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = getProjectEndpoint();
  const token = await getAuthToken();
  const fullUrl = `${endpoint}${path}`;
  console.log(`[foundryAgentClient] ${init?.method || 'GET'} ${fullUrl}`);
  const res = await fetch(fullUrl, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Foundry API ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<T>;
}

// Cache for agent name -> agent ID lookups (no longer used with bridge service)
const agentCache: Record<string, string> = {};

/**
 * Resolves agent identifier to agent ID
 * For native agents via bridge service, just returns the ID as-is
 * (no REST API lookup needed - the SDK handles it)
 */
export async function resolveAgentId(agentIdOrName: string): Promise<string> {
  // For bridge service usage, we can pass agent IDs directly
  // The Microsoft Agent Framework SDK will handle resolution
  console.log(`[foundryAgentClient] Using agent: ${agentIdOrName}`);
  return agentIdOrName;
}

/**
 * Validates that the bridge service is available and responding
 */
async function validateBridgeService(bridgeUrl: string): Promise<void> {
  try {
    const response = await fetch(`${bridgeUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`Bridge service health check failed: ${response.status} ${response.statusText}`);
    }
    
    const health = await response.json() as any;
    console.log(`[foundryAgentClient] ✅ Bridge service is healthy`);
    console.log(`[foundryAgentClient]   Endpoint: ${health.endpoint || 'unknown'}`);
    console.log(`[foundryAgentClient]   Agents configured: agent1=${health.agents_configured?.agent1}, agent2=${health.agents_configured?.agent2}, agent3=${health.agents_configured?.agent3}`);
  } catch (err) {
    const error = err as Error;
    console.error(`[foundryAgentClient] ⚠️ Bridge service validation failed: ${error.message}`);
    throw new Error(`Azure AI Foundry bridge service unavailable at ${bridgeUrl}: ${error.message}`);
  }
}

/**
 * Invokes an Azure AI Foundry native agent via the Python bridge service
 * The bridge service uses Microsoft Agent Framework SDK to invoke native agents
 */
export async function invokeNativeAgent(agentId: string, prompt: string, timeoutMs: number = 60000): Promise<string> {
  const bridgeUrl = process.env.AGENT_BRIDGE_SERVICE_URL || 'http://127.0.0.1:8001';
  
  if (!agentId || !agentId.trim()) {
    throw new Error('Agent ID cannot be empty. Check FOUNDRY_AGENT_1_ID, FOUNDRY_AGENT_2_ID, or FOUNDRY_AGENT_3_ID in .env.local');
  }
  
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }
  
  console.log(`[foundryAgentClient] Invoking native agent via bridge: ${agentId}`);
  console.log(`[foundryAgentClient] Bridge URL: ${bridgeUrl}`);
  console.log(`[foundryAgentClient] Timeout: ${timeoutMs}ms`);
  console.log(`[foundryAgentClient] Prompt length: ${prompt.length} characters`);
  
  try {
    // Validate bridge service availability on first invocation
    await validateBridgeService(bridgeUrl);
    
    const response = await fetch(`${bridgeUrl}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId,
        prompt: prompt,
        timeout_ms: timeoutMs
      })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorText = '';
      
      try {
        if (contentType?.includes('application/json')) {
          const errorData = await response.json() as any;
          errorText = errorData.detail || JSON.stringify(errorData);
        } else {
          errorText = await response.text();
        }
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      
      throw new Error(`Bridge service failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { response: string; duration_ms: number; agent_id: string };
    
    if (!data.response) {
      throw new Error('Bridge service returned empty response');
    }
    
    console.log(`[foundryAgentClient] ✅ Native agent responded in ${data.duration_ms}ms`);
    console.log(`[foundryAgentClient]   Response length: ${data.response.length} characters`);
    
    return data.response;
  } catch (err) {
    const error = err as Error;
    
    // Debug: Log full error details
    console.error(`[foundryAgentClient] Bridge error details:`, {
      errorMessage: error.message,
      agentId: agentId,
      bridgeUrl: bridgeUrl
    });
    
    // Check if it's a network error (bridge service not running)
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED') || error.message.includes('unavailable')) {
      console.error(`[foundryAgentClient] ❌ BRIDGE SERVICE NOT RUNNING`);
      console.error(`[foundryAgentClient] Make sure the agent bridge service is running:`);
      console.error(`[foundryAgentClient]   npm run agent-bridge`);
      throw new Error(`Azure AI Foundry bridge service not running at ${bridgeUrl}. Start it with: npm run agent-bridge`);
    }
    
    // Check if agent ID is invalid or configuration error
    if (error.message.includes('not found') || error.message.includes('invalid') || error.message.includes('asst_')) {
      console.error(`[foundryAgentClient] ❌ AGENT CONFIGURATION ERROR: ${agentId}`);
      console.error(`[foundryAgentClient] Check if the agent exists in your Azure AI Foundry project.`);
      throw new Error(`Agent invocation failed for ${agentId}. Full error: ${error.message}`);
    }
    
    throw new Error(`Failed to invoke native agent via bridge: ${error.message}`);
  }
}

export async function askAgent(assistantIdOrName: string, prompt: string, opts?: { pollMs?: number; timeoutMs?: number }): Promise<string> {
  return tracer.startActiveSpan('agent.ask', async (span) => {
    const pollMs = opts?.pollMs ?? 1000;
    const timeoutMs = opts?.timeoutMs ?? 60000;
    const start = Date.now();

    try {
      // Validate inputs
      if (!assistantIdOrName || !assistantIdOrName.trim()) {
        throw new Error('Agent ID/name cannot be empty');
      }
      
      if (!prompt || !prompt.trim()) {
        throw new Error('Prompt cannot be empty');
      }
      
      console.log(`[foundryAgentClient] ✨ Starting agent invocation`);
      console.log(`[foundryAgentClient]   Input: ${assistantIdOrName}`);
      console.log(`[foundryAgentClient]   Timeout: ${timeoutMs}ms`);
      
      // Resolve agent name to ID if needed (cached after first lookup)
      const agentId = await resolveAgentId(assistantIdOrName);
      
      span.setAttributes({
        'ai.agent.agent_id': agentId,
        'ai.agent.agent_input': assistantIdOrName,
        'ai.agent.timeout_ms': timeoutMs,
        'ai.agent.poll_interval_ms': pollMs,
        'ai.agent.prompt_length': prompt.length
      });
      
      // Optionally record prompt if enabled
      if (process.env.AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED?.toLowerCase() === 'true') {
        span.setAttribute('ai.agent.prompt', prompt.substring(0, 1000));
      }

      console.log(`[foundryAgentClient] 📤 Sending request to Azure AI Foundry...`);
      
      // Invoke Azure AI Foundry native agent via bridge service
      // Native agents require the bridge service - REST API only supports OpenAI Assistants format
      const result = await invokeNativeAgent(agentId, prompt, timeoutMs);
      
      const duration = Date.now() - start;
      
      console.log(`[foundryAgentClient] ✅ Agent completed successfully`);
      console.log(`[foundryAgentClient]   Duration: ${duration}ms`);
      console.log(`[foundryAgentClient]   Response length: ${result.length} characters`);
      
      span.setAttributes({
        'ai.agent.duration_ms': duration,
        'ai.agent.response_length': result.length,
        'ai.agent.method': 'native_agent_bridge'
      });
      
      if (process.env.AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED?.toLowerCase() === 'true') {
        span.setAttribute('ai.agent.response', result.substring(0, 1000));
      }
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const err = error as Error;
      
      console.error(`[foundryAgentClient] ❌ Agent invocation failed after ${duration}ms`);
      console.error(`[foundryAgentClient]   Error: ${err.message}`);
      
      // Provide helpful debugging information based on error type
      if (err.message.includes('bridge service')) {
        console.error(`[foundryAgentClient]`);
        console.error(`[foundryAgentClient] 🔧 TROUBLESHOOTING GUIDE:`);
        console.error(`[foundryAgentClient]   1. Verify bridge service is running: npm run agent-bridge`);
        console.error(`[foundryAgentClient]   2. Check AGENT_BRIDGE_SERVICE_URL is set (default: http://127.0.0.1:8001)`);
        console.error(`[foundryAgentClient]   3. Ensure AZURE_AI_FOUNDRY_PROJECT_ENDPOINT is set in .env.local`);
        console.error(`[foundryAgentClient]   4. Verify FOUNDRY_AGENT_1_ID matches an agent in your Azure AI Foundry project`);
      } else if (err.message.includes('Agent not found')) {
        console.error(`[foundryAgentClient]`);
        console.error(`[foundryAgentClient] 🔧 TROUBLESHOOTING GUIDE:`);
        console.error(`[foundryAgentClient]   1. Run: npm run discover:agents`);
        console.error(`[foundryAgentClient]   2. Update .env.local with valid agent ID from the output`);
      }
      
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

export default { askAgent };
