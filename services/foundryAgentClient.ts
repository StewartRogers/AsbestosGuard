import { DefaultAzureCredential } from '@azure/identity';

type MessageContent = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const AI_SCOPE = 'https://ai.azure.com/.default';

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

const API_VERSIONS = ['2025-05-01', '2025-05-15-preview', '2025-05-01-preview', '2024-12-01-preview', '2024-11-01-preview'];

export async function createThread(): Promise<{ id: string }> {
  for (const apiVersion of API_VERSIONS) {
    try {
      return await api(`/threads?api-version=${apiVersion}`, { method: 'POST', body: JSON.stringify({}) });
    } catch (err) {
      console.log(`createThread failed with ${apiVersion}: ${(err as Error).message}`);
    }
  }
  throw new Error('Failed to create thread with any supported API version');
}

export async function addMessage(threadId: string, message: MessageContent): Promise<void> {
  for (const apiVersion of API_VERSIONS) {
    try {
      await api(`/threads/${threadId}/messages?api-version=${apiVersion}`, {
        method: 'POST',
        body: JSON.stringify({ role: message.role, content: message.content })
      });
      return;
    } catch (err) {
      console.log(`addMessage failed with ${apiVersion}: ${(err as Error).message}`);
    }
  }
  throw new Error('Failed to add message with any supported API version');
}

export async function runThread(threadId: string, assistantId: string): Promise<{ id: string; status: string }> {
  for (const apiVersion of API_VERSIONS) {
    try {
      return await api(`/threads/${threadId}/runs?api-version=${apiVersion}`, {
        method: 'POST',
        body: JSON.stringify({ assistant_id: assistantId })
      });
    } catch (err) {
      console.log(`runThread failed with ${apiVersion}: ${(err as Error).message}`);
    }
  }
  throw new Error('Failed to run thread with any supported API version');
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
      // API returns { data: [...], object, first_id, last_id, has_more }
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
  const pollMs = opts?.pollMs ?? 1000;
  const timeoutMs = opts?.timeoutMs ?? 60000;
  const start = Date.now();

  const thread = await createThread();
  await addMessage(thread.id, { role: 'user', content: prompt });
  const run = await runThread(thread.id, assistantId);

  let status = run.status;
  while (status && status !== 'completed') {
    if (Date.now() - start > timeoutMs) throw new Error('Agent run timed out');
    await new Promise(r => setTimeout(r, pollMs));
    const curr = await getRun(thread.id, run.id);
    status = curr.status;
    if (status === 'failed' || status === 'cancelled') throw new Error(`Agent run ${status}`);
  }

  const messages = await getMessages(thread.id);
  const lastAssistant = messages.reverse().find(m => m.role === 'assistant');
  const text = lastAssistant?.content?.find(c => c.type === 'text')?.text?.value ?? '';
  return text;
}

export default { askAgent };
