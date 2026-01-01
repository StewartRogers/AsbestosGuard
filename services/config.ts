/**
 * Centralized configuration utilities
 * Provides consistent environment variable access and validation
 */

export interface AgentConfig {
  id: string;
  key: 'agent1' | 'agent2' | 'agent3';
}

/**
 * Get agent ID from environment variables
 * Supports multiple environment variable naming conventions
 */
export function getAgentId(agentKey: 'agent1' | 'agent2' | 'agent3'): string {
  const agentNum = agentKey.replace('agent', '');
  
  const candidates = [
    process.env[`FOUNDRY_AGENT_${agentNum}_ID`],
    process.env[`FOUNDRY_AGENT_${agentNum}_NAME`],
    process.env[`AZURE_AI_FOUNDRY_AGENT_${agentNum}_ID`]
  ].filter(Boolean) as string[];

  if (!candidates.length) {
    throw new Error(
      `Missing Foundry agent ID for ${agentKey}. ` +
      `Set FOUNDRY_AGENT_${agentNum}_ID in .env.local`
    );
  }

  return candidates[0];
}

/**
 * Get all configured agent IDs
 */
export function getAllAgentIds(): Record<string, string> {
  const agents: Record<string, string> = {};
  
  for (const key of ['agent1', 'agent2', 'agent3'] as const) {
    try {
      agents[key] = getAgentId(key);
    } catch {
      // Agent not configured - skip
    }
  }
  
  return agents;
}
