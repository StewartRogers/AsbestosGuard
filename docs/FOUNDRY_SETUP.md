# Azure AI Foundry Agents Setup Guide

This guide helps you connect your AsbestosGuard app to Azure AI Foundry Agents.

## Prerequisites

- ✅ Azure account with AI Foundry project
- ✅ Python 3.8+ installed
- ✅ Node.js 16+ installed
- ✅ Agent created in Azure AI Foundry

## Quick Setup (5 minutes)

### 1. Get Your Agent ID

```bash
# List all agents in your project
npm run discover:agents
```

This will display all available agents with their IDs. Copy the agent ID you want to use.

### 2. Configure Environment

Create or update `.env.local` in your project root:

```dotenv
# Required: Your Azure AI Foundry project endpoint
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project

# Required: Your agent ID (from discover:agents command)
FOUNDRY_AGENT_1_ID=EFSAGENT

# Optional: Additional agents if you have multiple
FOUNDRY_AGENT_2_ID=APPRISKANALYSIS
FOUNDRY_AGENT_3_ID=EMPWEBPROFILEAGENT
```

### 3. Validate Setup

```bash
npx tsx validate-foundry-setup.ts
```

This checks:
- ✅ Environment variables configured
- ✅ Files in correct locations
- ✅ Dependencies installed
- ✅ Network connectivity to Azure

### 4. Install Python Dependencies

```bash
pip install fastapi uvicorn azure-identity azure-ai-projects python-dotenv
```

### 5. Start the Services

**Terminal 1: Start the bridge service**
```bash
npm run agent-bridge
```

You should see:
```
✅ Using Foundry endpoint: https://...
📋 Configured agents:
   1. EFSAGENT
   2. APPRISKANALYSIS
   3. EMPWEBPROFILEAGENT
🚀 Starting Azure AI Foundry Agent Bridge Service
```

**Terminal 2: Start the app**
```bash
npm run start:dev
```

Or start both at once:
```bash
npm run start:with-bridge
```

## Verify It's Working

### Test Agent Connection

```bash
npm run test:foundry
```

### Test via API

```bash
# Chat with an agent
curl -X POST http://localhost:5000/__api/foundry/agent1/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, what is asbestos?"}'

# Analyze an application
curl -X POST http://localhost:5000/__api/foundry/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "application": {
      "companyName": "Test Company",
      "wizardData": {
        "firmLegalName": "Test Company Inc",
        "firmAccountNumber": "12345"
      }
    }
  }'
```

## Troubleshooting

### Error: "Bridge service not running"

**Solution:** Start the bridge service in a separate terminal:
```bash
npm run agent-bridge
```

### Error: "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set"

**Solution:** 
1. Add to `.env.local`:
```dotenv
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
```

2. Get the correct endpoint:
   - Go to [Azure AI Foundry](https://ai.azure.com)
   - Open your project
   - Copy the Project API Endpoint from Settings

### Error: "Agent not found"

**Solution:**
1. Run: `npm run discover:agents`
2. Copy a valid agent ID
3. Update `.env.local` with the correct ID
4. Restart both services

### Error: "Failed to authenticate with Azure"

**Solution:** You need to authenticate with Azure:

```bash
# Option 1: Use Azure CLI (recommended for development)
az login

# Option 2: Use service principal (for CI/CD)
export AZURE_CLIENT_ID=<your-client-id>
export AZURE_CLIENT_SECRET=<your-client-secret>
export AZURE_TENANT_ID=<your-tenant-id>
```

### Python dependency errors

**Solution:**
```bash
pip install --upgrade pip
pip install fastapi uvicorn azure-identity azure-ai-projects python-dotenv
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React App)                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Express Server (Node.js)                                    │
│ /__api/foundry/analyze                                      │
│ /__api/foundry/:agentKey/chat                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ TypeScript Service (foundryAgentClient.ts)                  │
│ - Validates inputs                                          │
│ - Handles errors                                            │
│ - Provides logging                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Python Bridge Service (agent-bridge-service.py)             │
│ POST /invoke                                                │
│ - Uses azure.ai.projects SDK                               │
│ - Creates threads & runs agents                             │
│ - Manages cleanup                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Azure AI Foundry                                            │
│ - Native Agents                                             │
│ - Project Endpoint                                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### foundryAgentClient.ts
- Main TypeScript client
- Validates inputs and configuration
- Calls Python bridge service
- Provides comprehensive error messages
- Includes OpenTelemetry tracing

### agent-bridge-service.py
- FastAPI service running on `http://127.0.0.1:8001`
- Uses `azure.ai.projects.AIProjectClient`
- Creates threads, adds messages, runs agents
- Polls for completion and retrieves results
- Returns structured responses

### server.ts
- Express endpoints for analysis and chat
- Routes to foundryAgentClient
- Provides helpful error responses
- Returns status information

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` | ✅ Yes | Your Azure AI Foundry project endpoint |
| `FOUNDRY_AGENT_1_ID` | ✅ Yes | First agent ID or name |
| `FOUNDRY_AGENT_2_ID` | ⚠️ Optional | Second agent ID or name |
| `FOUNDRY_AGENT_3_ID` | ⚠️ Optional | Third agent ID or name |
| `AGENT_BRIDGE_SERVICE_URL` | ⚠️ Optional | Bridge service URL (default: http://127.0.0.1:8001) |
| `AGENT_TOKEN` | ⚠️ Optional | Azure token (uses DefaultAzureCredential if not set) |

## Next Steps

1. **Customize the prompt** in `services/foundryAnalysisService.ts`
2. **Add more agents** by updating environment variables
3. **Integrate with UI** in React components
4. **Deploy to Azure** using the provided deployment scripts

## Support

- 🐛 See logs in both terminals for debugging
- 📋 Run `npm run discover:agents` to verify agents
- 🔧 Run `npx tsx validate-foundry-setup.ts` to check configuration
- 📚 Check [Azure AI Foundry docs](https://learn.microsoft.com/en-us/azure/ai-studio/)
