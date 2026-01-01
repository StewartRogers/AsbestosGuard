import { askAgent } from './foundryAgentClient.js';

function getAgentNameOrId(agentKey: string): string {
  const map: Record<string, string | undefined> = {
    agent1: process.env.FOUNDRY_AGENT_1_ID || process.env.FOUNDRY_AGENT_1_NAME || process.env.AZURE_AI_FOUNDRY_AGENT_1_ID,
    agent2: process.env.FOUNDRY_AGENT_2_ID || process.env.FOUNDRY_AGENT_2_NAME || process.env.AZURE_AI_FOUNDRY_AGENT_2_ID,
    agent3: process.env.FOUNDRY_AGENT_3_ID || process.env.FOUNDRY_AGENT_3_NAME || process.env.AZURE_AI_FOUNDRY_AGENT_3_ID,
  };
  const nameOrId = map[agentKey];
  if (!nameOrId) throw new Error(`Missing Foundry agent name/ID for key '${agentKey}'. Set FOUNDRY_AGENT_${agentKey.slice(-1)}_ID or FOUNDRY_AGENT_${agentKey.slice(-1)}_NAME.`);
  return nameOrId;
}

export async function chatWithAgent(agentKey: 'agent1' | 'agent2' | 'agent3', prompt: string): Promise<{ reply: string }> {
  const assistantId = getAgentNameOrId(agentKey);
  // Use the name/ID directly - Azure Foundry API supports both agent names and IDs
  console.log(`[foundryService] Using agent: ${assistantId}`);
  const resp = await askAgent(assistantId, prompt);
  return { reply: resp.response };
}

export default { chatWithAgent };
