import { askAgent } from './foundryAgentClient.js';
import { getAgentId } from './config.js';

export async function chatWithAgent(agentKey: 'agent1' | 'agent2' | 'agent3', prompt: string): Promise<{ reply: string }> {
  const assistantId = getAgentId(agentKey);
  console.log(`[foundryService] Using agent: ${assistantId}`);
  const resp = await askAgent(assistantId, prompt);
  return { reply: resp.response };
}

export default { chatWithAgent };
