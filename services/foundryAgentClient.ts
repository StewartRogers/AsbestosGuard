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

const agentCache: Record<string, string> = {};

function getApiVersions(): string[] {
  const versions = process.env.AZURE_AI_FOUNDRY_API_VERSIONS;
  if (!versions) {
    console.warn('[foundryAgentClient] AZURE_AI_FOUNDRY_API_VERSIONS not set in .env.local, using defaults');
    return ['2025-05-15-preview', '2025-05-01', '2025-05-01-preview', '2024-12-01-preview', '2024-11-01-preview'];
  }
  return versions.split(',').map(v => v.trim());
}

const API_VERSIONS = getApiVersions();

export async function createThread(): Promise<{ id: string }> {
  const result = await tracer.startActiveSpan('agent.create_thread', async (span): Promise<{ id: string }> => {
    try {
      for (const apiVersion of API_VERSIONS) {
        try {
          const result = await api<{ id: string }>(`/threads?api-version=${apiVersion}`, { method: 'POST', body: JSON.stringify({}) });
          span.setAttributes({
            'ai.agent.thread_id': result.id,
            'ai.agent.api_version': apiVersion
          });
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (err) {
          console.log(`createThread failed with ${apiVersion}: ${(err as Error).message}`);
        }
      }
      throw new Error('Failed to create thread with any supported API version');
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
  return result;
}

export async function addMessage(threadId: string, message: MessageContent): Promise<void> {
  return tracer.startActiveSpan('agent.add_message', async (span) => {
    try {
      span.setAttributes({
        'ai.agent.thread_id': threadId,
        'ai.agent.message_role': message.role
      });
      
      // Optionally record content if enabled
      if (process.env.AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED?.toLowerCase() === 'true') {
        span.setAttribute('ai.agent.message_content', message.content.substring(0, 1000));
      }
      
      for (const apiVersion of API_VERSIONS) {
        try {
          await api(`/threads/${threadId}/messages?api-version=${apiVersion}`, {
            method: 'POST',
            body: JSON.stringify({ role: message.role, content: message.content })
          });
          span.setStatus({ code: SpanStatusCode.OK });
          return;
        } catch (err) {
          console.log(`addMessage failed with ${apiVersion}: ${(err as Error).message}`);
        }
      }
      throw new Error('Failed to add message with any supported API version');
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function runThread(threadId: string, assistantId: string): Promise<{ id: string; status: string }> {
  const result = await tracer.startActiveSpan('agent.run_thread', async (span): Promise<{ id: string; status: string }> => {
    try {
      span.setAttributes({
        'ai.agent.thread_id': threadId,
        'ai.agent.assistant_id': assistantId
      });
      
      for (const apiVersion of API_VERSIONS) {
        try {
          const result = await api<{ id: string; status: string }>(`/threads/${threadId}/runs?api-version=${apiVersion}`, {
            method: 'POST',
            body: JSON.stringify({ assistant_id: assistantId })
          });
          span.setAttributes({
            'ai.agent.run_id': result.id,
            'ai.agent.run_status': result.status
          });
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (err) {
          console.log(`runThread failed with ${apiVersion}: ${(err as Error).message}`);
        }
      }
      throw new Error('Failed to run thread with any supported API version');
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
  return result;
}

export async function getRun(threadId: string, runId: string): Promise<{ id: string; status: string }> {
  for (const apiVersion of API_VERSIONS) {
    try {
      return await api(`/threads/${threadId}/runs/${runId}?api-version=${apiVersion}`, { method: 'GET' });
    } catch (err) {
      console.log(`getRun failed with ${apiVersion}: ${(err as Error).message}`);
    }
  }
  throw new Error('Failed to get run with any supported API version');
}

export async function getMessages(threadId: string): Promise<Array<{ role: string; content: Array<{ type: string; text?: { value: string } }> }>> {
  for (const apiVersion of API_VERSIONS) {
    try {
      const response = await api(`/threads/${threadId}/messages?api-version=${apiVersion}`, { method: 'GET' });
      if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
        return (response as any).data;
      }
      return response as any;
    } catch (err) {
      console.log(`getMessages failed with ${apiVersion}: ${(err as Error).message}`);
    }
  }
  throw new Error('Failed to get messages with any supported API version');
}

export async function askAgent(assistantId: string, prompt: string, opts?: { pollMs?: number; timeoutMs?: number }): Promise<string> {
  return tracer.startActiveSpan('agent.ask', async (span) => {
    const pollMs = opts?.pollMs ?? 1000;
    const timeoutMs = opts?.timeoutMs ?? 60000;
    const start = Date.now();

    try {
      span.setAttributes({
        'ai.agent.assistant_id': assistantId,
        'ai.agent.timeout_ms': timeoutMs,
        'ai.agent.poll_interval_ms': pollMs
      });
      
      // Optionally record prompt if enabled
      if (process.env.AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED?.toLowerCase() === 'true') {
        span.setAttribute('ai.agent.prompt', prompt.substring(0, 1000));
      }

      const thread = await createThread();
      span.setAttribute('ai.agent.thread_id', thread.id);
      
      await addMessage(thread.id, { role: 'user', content: prompt });
      const run = await runThread(thread.id, assistantId);
      span.setAttribute('ai.agent.run_id', run.id);

      let status = run.status;
      let pollCount = 0;
      while (status && status !== 'completed') {
        if (Date.now() - start > timeoutMs) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Agent run timed out' });
          throw new Error('Agent run timed out');
        }
        await new Promise(r => setTimeout(r, pollMs));
        pollCount++;
        const curr = await getRun(thread.id, run.id);
        status = curr.status;
        if (status === 'failed' || status === 'cancelled') {
          span.setStatus({ code: SpanStatusCode.ERROR, message: `Agent run ${status}` });
          throw new Error(`Agent run ${status}`);
        }
      }

      const messages = await getMessages(thread.id);
      const lastAssistant = messages.reverse().find(m => m.role === 'assistant');
      const text = lastAssistant?.content?.find(c => c.type === 'text')?.text?.value ?? '';
      
      const duration = Date.now() - start;
      span.setAttributes({
        'ai.agent.duration_ms': duration,
        'ai.agent.poll_count': pollCount,
        'ai.agent.response_length': text.length,
        'ai.agent.status': 'completed'
      });
      
      // Optionally record response if enabled
      if (process.env.AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED?.toLowerCase() === 'true') {
        span.setAttribute('ai.agent.response', text.substring(0, 1000));
      }
      
      span.setStatus({ code: SpanStatusCode.OK });
      return text;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

export default { askAgent };
