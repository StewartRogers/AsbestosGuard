/**
 * Simplified Foundry Agent Client
 * Calls the local Python Agent Bridge Service
 */

import fetch from "node-fetch";

const BRIDGE_URL = process.env.AGENT_BRIDGE_SERVICE_URL || "http://127.0.0.1:8001";

export interface InvokeResponse {
  agent_id: string;
  response: string;
  duration_ms: number;
}

export interface AskAgentOptions {
  timeoutMs?: number;
  pollMs?: number; // accepted for API parity; bridge currently ignores
}

/**
 * Invoke a published agent via the Python bridge
 * @param agentId Name/ID of the agent (must match AGENT_RESPONSES_URLS keys)
 * @param prompt Prompt text to send
 * @param options Timeout config (number or object)
 */
export async function askAgent(
  agentId: string,
  prompt: string,
  options?: number | AskAgentOptions
): Promise<InvokeResponse> {
  const timeoutMs = typeof options === "number" ? options : options?.timeoutMs ?? 60000;

  if (!agentId) throw new Error("Agent ID is required");
  if (!prompt) throw new Error("Prompt is required");

  const res = await fetch(`${BRIDGE_URL}/invoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: agentId,
      prompt,
      timeout_ms: timeoutMs,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agent invocation failed (${res.status}): ${text}`);
  }

  const data: InvokeResponse = await res.json();
  return data;
}

/**
 * Optional health check
 */
export async function health(): Promise<{ status: string; agents: string[] }> {
  const res = await fetch(`${BRIDGE_URL}/health`);
  if (!res.ok) throw new Error("Bridge health check failed");
  return res.json();
}
