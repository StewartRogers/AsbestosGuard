#!/usr/bin/env node
/**
 * Node.js Agent Bridge Service
 * Provides HTTP bridge to Azure AI Foundry native agents
 * Delegates to Python script for actual agent invocation
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

const FOUNDRY_ENDPOINT = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || '';
const AGENT_1 = process.env.FOUNDRY_AGENT_1_ID || 'EFSAGENT';
const AGENT_2 = process.env.FOUNDRY_AGENT_2_ID || 'APPRISKANALYSIS';
const AGENT_3 = process.env.FOUNDRY_AGENT_3_ID || 'EMPWEBPROFILEAGENT';

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoint: FOUNDRY_ENDPOINT,
    agents: [AGENT_1, AGENT_2, AGENT_3]
  });
});

app.post('/invoke', async (req, res) => {
  const { agent_id, prompt, timeout_ms = 60000 } = req.body;
  
  console.log(`[node-bridge] Invoking agent: ${agent_id}`);
  console.log(`[node-bridge] Prompt length: ${prompt?.length || 0} chars`);
  
  try {
    // Create a Python script to invoke the agent using the SDK
    const pythonScript = `
import os
import sys
import json
import time
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

start = time.time()
endpoint = "${FOUNDRY_ENDPOINT}"
agent_id = "${agent_id}"
prompt = json.loads(r'''${JSON.stringify(prompt)}''')
timeout_ms = ${timeout_ms}

try:
    credential = DefaultAzureCredential()
    client = AIProjectClient.from_connection_string(endpoint, credential)
    
    # Get agent
    agent = client.agents.get_agent(agent_id)
    print(f"[python] Got agent: {agent.id}", file=sys.stderr)
    
    # Create thread
    thread = client.agents.create_thread()
    print(f"[python] Created thread: {thread.id}", file=sys.stderr)
    
    try:
        # Add message
        message = client.agents.create_message(
            thread_id=thread.id,
            role="user", 
            content=prompt
        )
        
        # Create run
        run = client.agents.create_run(thread_id=thread.id, assistant_id=agent_id)
        
        # Poll for completion
        import time as time_module
        max_wait = timeout_ms / 1000
        elapsed = 0
        
        while elapsed < max_wait:
            run = client.agents.get_run(thread_id=thread.id, run_id=run.id)
            if run.status == "completed":
                break
            elif run.status in ["failed", "cancelled", "expired"]:
                raise Exception(f"Run {run.status}")
            time_module.sleep(0.5)
            elapsed += 0.5
        
        if run.status != "completed":
            raise Exception(f"Timeout after {timeout_ms}ms")
        
        # Get response
        messages = client.agents.list_messages(thread_id=thread.id)
        response_text = ""
        
        if hasattr(messages, 'data'):
            for msg in reversed(messages.data):
                if msg.role == "assistant":
                    if hasattr(msg, 'content') and msg.content:
                        content = msg.content[0]
                        if hasattr(content, 'text'):
                            response_text = content.text
                            break
        
        duration = int((time.time() - start) * 1000)
        result = {
            "response": response_text or "(No response)",
            "duration_ms": duration,
            "agent_id": agent_id
        }
        print(json.dumps(result))
    finally:
        client.agents.delete_thread(thread.id)
        
except Exception as e:
    import traceback
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}), file=sys.stdout)
    sys.exit(1)
`;

    const { stdout, stderr } = await execAsync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`, {
      timeout: timeout_ms + 5000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (stderr) {
      console.log(`[node-bridge] Python stderr: ${stderr}`);
    }
    
    const result = JSON.parse(stdout);
    
    if (result.error) {
      return res.status(500).json({ error: result.error, traceback: result.traceback });
    }
    
    console.log(`[node-bridge] Agent responded in ${result.duration_ms}ms`);
    res.json(result);
  } catch (err) {
    console.error(`[node-bridge] Error:`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = 8001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[node-bridge] Agent Bridge Service started on http://127.0.0.1:${PORT}`);
  console.log(`[node-bridge] Endpoint: ${FOUNDRY_ENDPOINT}`);
  console.log(`[node-bridge] Agents: ${[AGENT_1, AGENT_2, AGENT_3].join(', ')}`);
});
