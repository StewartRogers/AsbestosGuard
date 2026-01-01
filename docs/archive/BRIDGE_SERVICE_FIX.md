# Bridge Service Bug Fix: Native Agent API

## Problem Identified
The bridge service was using `agent-framework-azure-ai` which wraps the **OpenAI Assistants API**. This API requires assistant IDs in the format `asst_*`, but Azure AI Foundry **native agents** use names like `EFSAGENT`.

**Error that occurred:**
```
Expected an ID that begins with 'asst_'
```

This was because the bridge was trying to invoke OpenAI assistants, not Azure AI Foundry native agents.

## Solution Implemented
Replaced the incorrect SDK with the correct one:

### Before (WRONG):
```python
from agent_framework_azure_ai import AzureAIAgentClient

# This tried to use OpenAI Assistants API with asst_* IDs
agent_client = AzureAIAgentClient(
    agent_id=agent_id,  # EFSAGENT → doesn't match asst_* format
    project_endpoint=FOUNDRY_ENDPOINT,
    credential=credential
)
response = await agent_client.get_response(prompt)
```

### After (CORRECT):
```python
from azure.ai.projects import AIProjectClient

# Use native Azure AI Foundry agents
project_client = AIProjectClient.from_connection_string(
    conn_str=FOUNDRY_ENDPOINT,
    credential=credential
)

# Create thread, send message, run agent
thread = project_client.agents.create_thread()
message = project_client.agents.create_message(
    thread_id=thread.id,
    role="user",
    content=prompt
)

# Run with native agent ID (EFSAGENT, not asst_EFSAGENT)
run = project_client.agents.create_run(
    thread_id=thread.id,
    assistant_id=agent_id  # Works with "EFSAGENT" directly
)

# Poll until completion
while run_status.status != "completed":
    # Wait and check status
    
# Extract response from messages
```

## Files Modified

### 1. `agent-bridge-service.py`
- **Changed:** Imports - replaced `agent_framework_azure_ai` with `azure.ai.projects.AIProjectClient`
- **Changed:** `invoke_agent_async()` function - complete rewrite to use native agent API
  - Creates thread
  - Sends message
  - Runs agent with native ID
  - Polls for completion
  - Extracts response from messages
  - Cleans up thread
- **Added:** Detailed logging at each step

### 2. `requirements.txt`
- **Removed:** `agent-framework-azure-ai`
- **Added:** `azure-ai-projects`, `azure-identity`

### 3. `services/foundryAgentClient.ts`
- **Enhanced:** Error logging to show exact bridge service error
- **Improved:** Error detection for configuration issues

## How It Works Now

1. TypeScript client (`foundryAgentClient.ts`) sends:
   ```json
   {
     "agent_id": "EFSAGENT",
     "prompt": "Your question here",
     "timeout_ms": 60000
   }
   ```

2. Bridge service (`agent-bridge-service.py`):
   - Authenticates with Azure
   - Creates AIProjectClient
   - Creates a thread (conversation context)
   - Sends the user message to the thread
   - Runs the native agent with `assistant_id=EFSAGENT`
   - Polls until completion (or timeout)
   - Extracts the assistant's response
   - Cleans up the thread

3. Bridge returns:
   ```json
   {
     "response": "Agent response text",
     "duration_ms": 1234,
     "agent_id": "EFSAGENT"
   }
   ```

## Testing

Start the bridge service:
```bash
npm run agent-bridge
# or
python agent-bridge-service.py
```

Then run tests:
```bash
npm run test:foundry
```

## Key Differences from Previous Approaches

| Aspect | Previous (WRONG) | Current (CORRECT) |
|--------|-----------------|------------------|
| SDK | agent-framework-azure-ai | azure-ai-projects |
| API Type | OpenAI Assistants | Azure AI Foundry Native |
| Agent ID Format | `asst_*` (OpenAI format) | `EFSAGENT` (native names) |
| Invocation | Single async call | Thread + message + run |
| Response Type | Direct response object | Extract from messages |

## Why This Matters

- **Native agents** are managed in Azure AI Foundry with custom IDs
- **OpenAI Assistants** (now deprecated) used asst_* format
- The previous solution tried to use the OpenAI approach with native agent IDs
- The correct solution uses Azure's native agent service

This is now aligned with how Azure AI Foundry actually works.
