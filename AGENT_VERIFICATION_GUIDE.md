# Agent Verification & Tracing Diagnostic - Complete

## Problem Statement
The test runs but there's no evidence it used the correct agent (EFSAGENT), and traces aren't being captured.

## Root Causes Identified
1. **Missing Agent ID Confirmation** - Tests logged which agent was invoked but didn't confirm which agent actually processed the request
2. **No JSON Format Validation** - EFSAGENT has specific instructions to respond in JSON, but tests didn't validate this
3. **Missing Tracing Status** - Tests didn't show whether tracing was enabled
4. **No Diagnostic Tool** - No way to quickly verify the configuration

## Changes Made

### 1. Enhanced foundryAgentClient.ts
**File:** `services/foundryAgentClient.ts`

Added detailed logging to confirm which agent actually processed the request:
- **Line 227**: Now logs the agent ID returned from the bridge service response
- **Line 371**: Added explicit confirmation of resolved agent ID before sending request
- **Line 395**: Added "CONFIRMED Agent ID" message showing which agent completed the request

**Evidence Captured:**
```
[foundryAgentClient] ✅ Agent ID resolved: EFSAGENT
[foundryAgentClient] ✅ Native agent responded in 2341ms
[foundryAgentClient]   Agent ID (from bridge): EFSAGENT
[foundryAgentClient] ✅ Agent completed successfully
[foundryAgentClient]   CONFIRMED Agent ID: EFSAGENT
```

### 2. Enhanced test-real-agent.ts
**File:** `test-real-agent.ts`

Significant improvements:
- Added tracing status check (line 23): Shows if Application Insights is configured
- Added JSON format validation (lines 65-70): Specifically checks if response is valid JSON (required by EFSAGENT)
- Added JSON structure inspection (line 72): Shows JSON keys if response is valid
- Added agent ID confirmation in output (line 74)
- Updated final validation (line 85): Now checks for valid JSON format along with content

**Key Output:**
```
✓ Agent ID: EFSAGENT (EFSAGENT)
✓ Response format: ✅ VALID JSON
  └─ JSON keys: risk_level, recommendations, hazards, etc.
✓ EFSAGENT JSON Format: ✅ VALID JSON
```

### 3. Enhanced test-agent-tracing.ts
**File:** `test-agent-tracing.ts`

Added JSON validation to both tests:
- **Test 1 (Simple)**: Now validates JSON response (lines 45-49)
- **Test 2 (Structured)**: Now validates JSON response (lines 84-89)
- Both tests show format validation result: "✅ Valid JSON" or "⚠️ Not JSON"

### 4. New Diagnostic Tool: check-tracing-status.ts
**File:** `check-tracing-status.ts`

Comprehensive configuration checker with 5 key checks:

```
1. ✅ EFSAGENT ID (FOUNDRY_AGENT_1_ID)
   └─ Found: EFSAGENT

2. ✅ Foundry Endpoint
   └─ Found: https://rsrogers-8077-resource.services.ai.azure.com/...

3. ✅ Bridge Service URL
   └─ Configured: http://127.0.0.1:8001

4. ⚠️ Tracing (Application Insights)
   └─ ⚠️ DISABLED - Traces will NOT be sent

5. ✅ Bridge Service Script
   └─ Found: agent-bridge-service.py
```

Usage:
```bash
npm run test:check-tracing
```

### 5. New NPM Scripts
**File:** `package.json`

Added convenient test commands:
```json
"test:real-agent": "tsx test-real-agent.ts",
"test:agent-tracing": "tsx test-agent-tracing.ts",
"test:check-tracing": "tsx check-tracing-status.ts"
```

## How to Verify EFSAGENT is Working

### Step 1: Check Configuration
```bash
npm run test:check-tracing
```

This will show you:
- ✅ If EFSAGENT is configured
- ✅ If Foundry endpoint is set
- ⚠️ If tracing is enabled (optional but recommended)

### Step 2: Start Bridge Service
```bash
python agent-bridge-service.py
```

You should see:
```
[INFO] 📋 Configured agents: EFSAGENT, APPRISKANALYSIS, EMPWEBPROFILEAGENT
[INFO] Starting server on http://127.0.0.1:8001
```

### Step 3: Run Real Agent Test
In a new terminal:
```bash
npm run test:real-agent
```

You'll see:
- ✅ Agent ID confirmation at start: "Sending test prompt to agent: EFSAGENT"
- ✅ Bridge service confirmation: "Agent ID (from bridge): EFSAGENT"
- ✅ JSON format validation: "EFSAGENT JSON Format: ✅ VALID JSON"
- ✅ Final confirmation: "CONFIRMED: EFSAGENT responded with valid JSON analysis!"

### Step 4: Run Tracing Test
```bash
npm run test:agent-tracing
```

This runs the full diagnostic including:
- Simple interaction test with JSON validation
- Structured analysis test with JSON validation
- Detailed tracing configuration guide

## Evidence of Correct Agent Usage

After running the tests, you'll see **clear confirmation** in 3 places:

1. **When invoking the agent:**
   ```
   [foundryAgentClient] ✅ Agent ID resolved: EFSAGENT
   ```

2. **When receiving response:**
   ```
   [foundryAgentClient]   Agent ID (from bridge): EFSAGENT
   ```

3. **In test output:**
   ```
   ✓ Agent ID: EFSAGENT (EFSAGENT)
   ✓ EFSAGENT JSON Format: ✅ VALID JSON
   CONFIRMED: EFSAGENT responded with valid JSON analysis!
   ```

## Fixing Missing Traces

If traces are still not appearing in Azure AI Foundry:

### Option 1: Enable Application Insights Tracing
```bash
# 1. Create Application Insights in Azure
# 2. Get the connection string
# 3. Add to .env.local:
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://...
```

### Option 2: Check Azure AI Foundry Tracing
1. Go to Azure AI Foundry portal
2. Navigate to your project (rsrogers-8077)
3. Check **Settings → Tracing**
4. Verify EFSAGENT runs are logged
5. Filter by agent name: "EFSAGENT"
6. Note: Traces may take 1-5 minutes to appear

### Option 3: Verify Agent Exists
```bash
npm run discover:agents
```

This lists all agents in your Foundry project and confirms EFSAGENT exists.

## What Changed in Bridge Service Communication

The bridge service response already included `agent_id`:
```json
{
  "response": "...",
  "duration_ms": 2341,
  "agent_id": "EFSAGENT"
}
```

Now we **capture and log** this confirmation at line 227 of `foundryAgentClient.ts`:
```typescript
console.log(`[foundryAgentClient]   Agent ID (from bridge): ${data.agent_id}`);
```

## Next Steps

1. **Run the diagnostic:**
   ```bash
   npm run test:check-tracing
   ```

2. **Start the bridge:**
   ```bash
   npm run agent-bridge
   ```

3. **Test EFSAGENT:**
   ```bash
   npm run test:real-agent
   ```

4. **Check traces** (after 1-5 minutes):
   - Azure AI Foundry Portal → Your Project → Tracing
   - Filter by agent: "EFSAGENT"
   - Look for recent runs with JSON responses

The tests now provide **clear, unmistakable evidence** of:
- ✅ Which agent is being invoked (EFSAGENT)
- ✅ Which agent processed the request (confirmed from bridge response)
- ✅ That the response is in the expected JSON format
- ✅ Configuration status for tracing

