# Azure AI Foundry Agents - Connection Checklist

Use this checklist to ensure your app is properly connected to Azure AI Foundry Agents.

## Pre-Flight Check

### ✓ Environment Configuration
- [ ] `.env.local` file created
- [ ] `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` set and valid
- [ ] `FOUNDRY_AGENT_1_ID` set to your agent ID or name
- [ ] Agent ID verified with `npm run discover:agents`

### ✓ Dependencies Installed
- [ ] Node.js dependencies: `npm install` completed
- [ ] Python 3.8+ installed: `python --version` works
- [ ] Python packages installed: 
  ```bash
  pip install fastapi uvicorn azure-identity azure-ai-projects python-dotenv
  ```

### ✓ Azure Authentication
- [ ] Azure CLI installed: `az --version` works
- [ ] Logged in to Azure: `az login` completed
- [ ] Have access to the AI Foundry project
- [ ] Can list agents: `npm run discover:agents` shows agents

### ✓ Configuration Validated
- [ ] Run validation: `npm run validate:setup`
- [ ] All checks show ✅ (OK)
- [ ] No ❌ (Error) items remain

## Startup Sequence

### Step 1: Start Bridge Service
```bash
npm run agent-bridge
```

**Expected Output:**
```
✓ Using Foundry endpoint: https://your-project.services.ai.azure.com/api/projects/your-project
📋 Configured agents:
   1. EFSAGENT
   2. APPRISKANALYSIS
   3. EMPWEBPROFILEAGENT
🚀 Starting Azure AI Foundry Agent Bridge Service
🔌 Server: http://127.0.0.1:8001
```

**Checklist:**
- [ ] No errors in output
- [ ] Bridge service is listening on port 8001
- [ ] Endpoint URL is correct
- [ ] Agents are listed

### Step 2: Start Application Server
```bash
npm run start:dev  # In a different terminal
```

**Expected Output:**
```
✓ Server is running on port 5000
✓ Environment: development
✓ Storage: Local File System
```

**Checklist:**
- [ ] No errors in output
- [ ] Server is listening on port 5000
- [ ] No connection errors to bridge service

## Verification Tests

### Test 1: Bridge Service Health Check
```bash
curl http://127.0.0.1:8001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "endpoint": "https://your-project.services.ai.azure.com/api/projects/your-project",
  "agents_configured": {
    "agent1": "EFSAGENT",
    "agent2": "APPRISKANALYSIS",
    "agent3": "EMPWEBPROFILEAGENT"
  }
}
```

**Checklist:**
- [ ] Status is "healthy"
- [ ] Endpoint is correct
- [ ] Agents are listed
- [ ] HTTP status code is 200

### Test 2: Agent Chat Endpoint
```bash
curl -X POST http://localhost:5000/__api/foundry/agent1/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is asbestos?"}'
```

**Expected Response:**
```json
{
  "reply": "Asbestos is a naturally occurring mineral fiber..."
}
```

**Checklist:**
- [ ] HTTP status code is 200
- [ ] Response contains "reply" field
- [ ] Reply text is not empty
- [ ] Response time is < 60 seconds

### Test 3: Analysis Endpoint
```bash
curl -X POST http://localhost:5000/__api/foundry/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "application": {
      "companyName": "Test Company",
      "wizardData": {
        "firmLegalName": "Test Company Inc",
        "firmAccountNumber": "12345",
        "firmWorkersCount": 10,
        "firmCertLevel1to4": 5,
        "firmCertLevel3": 2,
        "historyRefused7Years": false,
        "historyRefusedAuth": false,
        "historyNonCompliance": false,
        "historySuspended": false
      }
    }
  }'
```

**Expected Response:**
```json
{
  "riskScore": "LOW|MEDIUM|HIGH",
  "isTestAccount": false,
  "summary": "Analysis summary...",
  "recommendation": "APPROVE|REJECT|REQUEST_INFO|...",
  ...
}
```

**Checklist:**
- [ ] HTTP status code is 200
- [ ] Response contains all required fields
- [ ] Risk score is one of: LOW, MEDIUM, HIGH
- [ ] Recommendation is one of: APPROVE, REJECT, REQUEST_INFO, INVALID_APPLICATION, MANUAL_REVIEW_REQUIRED
- [ ] Sources array contains analysis source

### Test 4: Automated Tests
```bash
npm run test:foundry
```

**Checklist:**
- [ ] Test completes without errors
- [ ] Output shows successful agent invocation
- [ ] Response contains expected data

## Troubleshooting Guide

### Issue: "Bridge service not running" or "ECONNREFUSED"

**Solution:**
1. Make sure bridge service is started: `npm run agent-bridge`
2. Verify it's listening on port 8001: `curl http://127.0.0.1:8001/health`
3. Check for Python errors in the bridge service terminal
4. Verify Python dependencies: `pip list | grep azure`

### Issue: "Agent not found"

**Solution:**
1. List available agents: `npm run discover:agents`
2. Copy the correct agent ID
3. Update `.env.local`:
   ```
   FOUNDRY_AGENT_1_ID=<correct-agent-id>
   ```
4. Restart both services

### Issue: "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set"

**Solution:**
1. Get endpoint from Azure AI Foundry:
   - Go to https://ai.azure.com
   - Open your project
   - Copy "Project API endpoint" from Settings
2. Add to `.env.local`:
   ```
   AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
   ```
3. Restart services

### Issue: "Failed to authenticate with Azure"

**Solution:**
1. Log in to Azure CLI:
   ```bash
   az login
   ```
2. Set subscription if needed:
   ```bash
   az account set --subscription "Your Subscription ID"
   ```
3. Restart bridge service

### Issue: "Python module not found"

**Solution:**
```bash
pip install --upgrade pip
pip install fastapi uvicorn azure-identity azure-ai-projects python-dotenv
```

### Issue: Bridge service crashes on startup

**Solution:**
1. Check Python version: `python --version` (need 3.8+)
2. Check Python packages: `pip list`
3. Reinstall packages:
   ```bash
   pip uninstall azure-ai-projects -y
   pip install azure-ai-projects
   ```

## Performance Benchmarks

Expected performance when everything is configured correctly:

| Operation | Expected Time | Max Time |
|-----------|---------------|----------|
| Bridge health check | < 100ms | 500ms |
| Agent chat response | 5-15s | 60s |
| Analysis request | 10-30s | 60s |
| Agent discovery | < 2s | 10s |

If times exceed "Max Time", check:
- Network latency to Azure
- Agent processing time
- Bridge service logs
- Application logs

## Monitoring

### Check Bridge Service Logs
```bash
# Look for errors or warnings in the bridge service terminal
# Should see: ✅ successful operations and no ❌ errors
```

### Check Application Logs
```bash
# Look for Foundry-related messages in the app terminal
# Pattern: [foundryAgentClient] or [server]
# Should see: ✅ successful operations
```

### Check Azure Monitor (if configured)
- Go to Azure Portal
- Open Application Insights connected to your project
- Check "Logs" for agent operations
- Search for: `customDimensions.['ai.agent.agent_id']`

## Deployment Checklist

### Before deploying to Azure:

- [ ] All tests pass locally
- [ ] Bridge service runs on `http://127.0.0.1:8001`
- [ ] App connects successfully
- [ ] Agents respond correctly
- [ ] Error handling works
- [ ] `.env.local` variables are production values
- [ ] Authentication is configured (managed identity or service principal)
- [ ] Application Insights is set up (optional but recommended)

### Azure App Service setup:

- [ ] Web App created
- [ ] Python runtime selected
- [ ] `requirements.txt` created with Python dependencies
- [ ] `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` set in Configuration
- [ ] `FOUNDRY_AGENT_1_ID` set in Configuration
- [ ] Managed Identity or Service Principal configured
- [ ] Application Insights connected

### Monitoring after deployment:

- [ ] Check Application Insights for errors
- [ ] Monitor agent response times
- [ ] Set up alerts for failures
- [ ] Review agent output quality
- [ ] Monitor Azure AI Foundry quota usage

## Success Criteria

You know everything is working when:

✅ `npm run validate:setup` shows all checks passing
✅ Bridge service starts without errors
✅ App server starts without errors
✅ `curl http://127.0.0.1:8001/health` returns 200
✅ Chat endpoint returns agent responses
✅ Analysis endpoint returns structured results
✅ All logs show successful operations (✅ indicators)
✅ No error messages in console output

## Quick Reference Commands

```bash
# Validation
npm run validate:setup

# Discover agents
npm run discover:agents

# Start services
npm run agent-bridge        # Terminal 1
npm run start:dev          # Terminal 2

# Or start both together
npm run start:with-bridge

# Test
npm run test:foundry
npm run test:foundry-analysis

# Check bridge health
curl http://127.0.0.1:8001/health
```

## Support & Next Steps

1. ✅ Complete this checklist
2. ✅ All tests pass
3. ✅ Ready to integrate with your application
4. 📚 Read FOUNDRY_SETUP.md for detailed documentation
5. 🚀 Customize prompts in foundryAnalysisService.ts
6. 🔧 Deploy to Azure when ready

**For help:**
- Check error messages - they include solutions
- Run `npm run validate:setup`
- Review logs in both terminals
- Check FOUNDRY_SETUP.md troubleshooting section
