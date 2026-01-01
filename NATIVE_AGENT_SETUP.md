# Azure AI Foundry Native Agent Setup Guide

**Status:** ✅ Ready to use Azure AI Foundry native agents (EFSAGENT, APPRISKANALYSIS, EMPWEBPROFILEAGENT)

## What Was Implemented

Your TypeScript/Node.js application can now use **Azure AI Foundry native agents** through a Python bridge service that uses the **Microsoft Agent Framework SDK**.

### Architecture

```
TypeScript App (server.ts, foundryAgentClient.ts)
        ↓ HTTP POST
Python Bridge Service (agent-bridge-service.py)
        ↓ Microsoft Agent Framework SDK
Azure AI Foundry Native Agents (EFSAGENT, etc.)
```

---

## Setup Steps

### 1. Install Python Dependencies

```bash
# Install Python Agent Framework (REQUIRED: --pre flag for preview)
pip install agent-framework-azure-ai --pre

# Install bridge service dependencies
pip install fastapi uvicorn python-dotenv
```

**OR use requirements.txt:**
```bash
pip install -r requirements.txt
```

### 2. Start the Agent Bridge Service

```bash
# Start the Python bridge service (runs on port 8001)
npm run agent-bridge

# OR run directly:
python agent-bridge-service.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8001
```

Keep this terminal window open - the service must be running for agents to work.

### 3. Test the Bridge Service

In a new terminal:

```bash
# Test health endpoint
curl http://127.0.0.1:8001/health

# Expected response:
{
  "status": "healthy",
  "endpoint": "https://rsrogers-8077-resource.services.ai.azure.com/api/projects/rsrogers-8077",
  "agents_configured": {
    "agent1": "EFSAGENT",
    "agent2": "APPRISKANALYSIS",
    "agent3": "EMPWEBPROFILEAGENT"
  }
}
```

### 4. Run Your Application

In another terminal:

```bash
# Build TypeScript
npm run build

# Test agent invocation
npm run test:foundry-analysis
```

**OR start everything together:**
```bash
# Starts bridge service + app server + vite dev server
npm run start:with-bridge
```

---

## How It Works

### 1. TypeScript Code Calls Bridge Service

```typescript
// services/foundryAgentClient.ts
export async function invokeNativeAgent(agentId: string, prompt: string): Promise<string> {
  const bridgeUrl = 'http://127.0.0.1:8001';
  
  const response = await fetch(`${bridgeUrl}/invoke`, {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agentId,
      prompt: prompt,
      timeout_ms: 60000
    })
  });
  
  const data = await response.json();
  return data.response;
}
```

### 2. Bridge Service Invokes Native Agent

```python
# agent-bridge-service.py
from agents import Agent, AzureAIConfig

config = AzureAIConfig(
    endpoint="https://rsrogers-8077-resource.services.ai.azure.com",
    project="rsrogers-8077",
    credential=DefaultAzureCredential()
)

agent = Agent(agent_id="EFSAGENT", config=config)
response = await agent.invoke_async(prompt)
```

### 3. Response Returns to TypeScript

The bridge service returns JSON:
```json
{
  "response": "Agent analysis result...",
  "duration_ms": 2500,
  "agent_id": "EFSAGENT"
}
```

---

## Configuration

### Environment Variables (.env.local)

```env
# Azure AI Foundry endpoint
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://rsrogers-8077-resource.services.ai.azure.com/api/projects/rsrogers-8077

# Native agent IDs
FOUNDRY_AGENT_1_ID=EFSAGENT
FOUNDRY_AGENT_2_ID=APPRISKANALYSIS
FOUNDRY_AGENT_3_ID=EMPWEBPROFILEAGENT

# Bridge service URL
AGENT_BRIDGE_SERVICE_URL=http://127.0.0.1:8001
```

### Agent IDs

Your Azure AI Foundry native agents:
- **EFSAGENT** - Employee/Facility Safety agent (gpt-4.1-mini)
- **APPRISKANALYSIS** - Application Risk Analysis (gpt-4.1)
- **EMPWEBPROFILEAGENT** - Web Profile Search (gpt-4.1)

---

## Testing

### Test 1: Health Check

```bash
curl http://127.0.0.1:8001/health
```

### Test 2: List Agents

```bash
curl http://127.0.0.1:8001/agents
```

### Test 3: Invoke Agent

```bash
curl -X POST http://127.0.0.1:8001/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "EFSAGENT",
    "prompt": "Analyze this test application",
    "timeout_ms": 60000
  }'
```

### Test 4: Full Integration Test

```bash
npm run test:foundry-analysis
```

**Expected output:**
```
[foundryAgentClient] Invoking native agent via bridge: EFSAGENT
[foundryAgentClient] ✅ Native agent responded in 2500ms
[foundryAnalysisService] Received response from agent1
✅ Analysis completed successfully
```

---

## Troubleshooting

### Error: "Connection refused to http://127.0.0.1:8001"

**Problem:** Bridge service is not running

**Solution:**
```bash
# Start the bridge service
npm run agent-bridge
# OR
python agent-bridge-service.py
```

### Error: "No module named 'agents'"

**Problem:** Microsoft Agent Framework not installed

**Solution:**
```bash
pip install agent-framework-azure-ai --pre
```

### Error: "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set"

**Problem:** Environment variables not loaded

**Solution:**
- Ensure `.env.local` exists in project root
- Check that `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` is set
- Restart the bridge service

### Error: "Agent 'EFSAGENT' not found"

**Problem:** Agent doesn't exist in your Azure AI Foundry project

**Solution:**
1. Go to https://ai.azure.com/
2. Navigate to your project: rsrogers-8077
3. Check "Agents" section
4. Verify agent exists with correct ID

### Agent returns empty or error response

**Problem:** Agent configuration or prompt issue

**Solution:**
- Check agent instructions in Azure AI Foundry Portal
- Verify agent has proper model configuration
- Check agent logs in the portal

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run agent-bridge` | Start Python bridge service only |
| `npm run start:with-bridge` | Start bridge + app + vite (all in one) |
| `npm run test:foundry-analysis` | Test agent invocation |
| `npm run build` | Build TypeScript |

---

## Production Deployment

### Option 1: Deploy Bridge Service Separately

1. **Deploy Python service to Azure App Service:**
   ```bash
   # Create App Service for Python
   az webapp up --name your-agent-bridge --runtime PYTHON:3.11
   ```

2. **Update .env for production:**
   ```env
   AGENT_BRIDGE_SERVICE_URL=https://your-agent-bridge.azurewebsites.net
   ```

### Option 2: Use Azure Container Apps

1. **Create Dockerfile for bridge service:**
   ```dockerfile
   FROM python:3.11
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY agent-bridge-service.py .
   CMD ["python", "agent-bridge-service.py"]
   ```

2. **Deploy to Azure Container Apps**

### Option 3: Integrate into Main App

1. **Install Python in your App Service**
2. **Add startup script to run both Node.js and Python**
3. **Use local communication (127.0.0.1:8001)**

---

## Benefits of This Approach

✅ **Use Azure AI Foundry native agents** (EFSAGENT, APPRISKANALYSIS)  
✅ **No rewrite required** - TypeScript code barely changed  
✅ **Official SDK** - Uses Microsoft Agent Framework  
✅ **Scalable** - Bridge service can be deployed separately  
✅ **Flexible** - Easy to add more agents  
✅ **Tested** - Uses proven SDK instead of experimental REST endpoints  

---

## Next Steps

1. **Start the bridge service:**
   ```bash
   npm run agent-bridge
   ```

2. **Test it works:**
   ```bash
   npm run test:foundry-analysis
   ```

3. **Integrate into your workflow:**
   ```bash
   npm run start:with-bridge
   ```

4. **Deploy to production** when ready (see Production Deployment section)

---

## Support

- **Microsoft Agent Framework:** https://github.com/microsoft/agent-framework
- **Azure AI Foundry:** https://ai.azure.com/
- **Documentation:** https://learn.microsoft.com/azure/ai-services/

Your Azure AI Foundry native agents are now ready to use! 🎉
