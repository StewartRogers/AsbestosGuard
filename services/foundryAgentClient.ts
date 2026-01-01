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

/**
 * Invoke a published agent via the bridge
 * @param agentId Name of the agent (must match Python AGENT_RESPONSES_URLS)
 * @param prompt Prompt text
 * @param timeoutMs Timeout in milliseconds (default 60000)
 */
export async function askAgent(
  agentId: string,
  prompt: string,
  timeoutMs: number = 60000
): Promise<InvokeResponse> {
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
    throw new Error(`Agent invocation failed: ${text}`);
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
