# ✅ Tracing Enabled for EFSAGENT (agent1)

## Summary
OpenTelemetry tracing has been successfully added to your Azure AI Foundry agent client. The API is working correctly, and tracing infrastructure is now in place.

## What Was Done

### 1. ✅ Verified Agent is Working
- Ran diagnostic tests on EFSAGENT (agent1)
- Confirmed agent responds correctly
- Agent ID: `asst_WfzpVc2VFNSOimWtPFeH2M8A`
- Both simple and complex queries work

### 2. ✅ Installed OpenTelemetry Packages
```bash
npm install --save @azure/monitor-opentelemetry @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/instrumentation
```

### 3. ✅ Added Tracing Instrumentation
Modified `services/foundryAgentClient.ts` to include:
- OpenTelemetry initialization
- Azure Monitor integration
- Span creation for all agent operations
- Attribute tracking (thread IDs, run IDs, duration, token counts)
- Error handling and exception recording
- Optional prompt/response logging

### 4. ✅ Project Rebuilt
- TypeScript compilation successful
- All tracing code is now compiled and ready

## 🔧 Next Steps to See Traces

### Step 1: Get Application Insights Connection String

You need to connect Application Insights to your Foundry project:

#### Option A: Through Azure AI Foundry Portal
1. Go to [https://ai.azure.com/](https://ai.azure.com/)
2. Navigate to your project: **rsrogers-8077**
3. Click **Tracing** in left navigation
4. If no App Insights is connected:
   - Click "Create new" or "Connect existing"
   - Copy the **Connection String**

#### Option B: From Azure Portal
1. Go to Azure Portal
2. Find Application Insights: `asbestosguard-[env]-insights` (from your infrastructure)
3. Go to **Overview** → **Connection String**
4. Copy the value

### Step 2: Add to Environment Variables

Update `.env.local`:

```env
# Add this line with your connection string from Step 1:
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx;IngestionEndpoint=https://...

# Optional - to log prompts/responses in traces (WARNING: may contain sensitive data):
AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED=true
```

### Step 3: Restart Your Application

```bash
npm run start:dev
```

You should see this message in console:
```
[foundryAgentClient] ✅ OpenTelemetry tracing initialized with Azure Monitor
```

### Step 4: Test and Generate Traces

Run the diagnostic test:
```bash
npx tsx test-agent-tracing.ts
```

Or use your application normally - every agent call will now generate traces.

### Step 5: View Traces

Wait 1-5 minutes after running, then:

#### In Azure AI Foundry Portal:
1. Go to [https://ai.azure.com/](https://ai.azure.com/)
2. Your project: **rsrogers-8077**
3. Click **Tracing**
4. Filter by:
   - Agent name: EFSAGENT
   - Time range: Last hour
   - Operation: agent.ask

#### In Application Insights (Azure Portal):
1. Go to your Application Insights resource
2. **Agents (Preview)** → See agent-specific view
3. **Transaction search** → Filter by custom dimensions
4. **Performance** → See latency and token usage

## 📊 What Gets Traced

With tracing enabled, you'll see:

- ✅ **Thread Creation** - When conversations start
- ✅ **Message Operations** - User prompts being sent
- ✅ **Agent Runs** - Agent execution and status
- ✅ **Duration/Latency** - How long each operation takes
- ✅ **Thread & Run IDs** - For debugging specific conversations
- ✅ **API Versions** - Which API version succeeded
- ✅ **Errors & Exceptions** - Full error details with stack traces

### Optional (if content recording enabled):
- ✅ **Prompts** - What you sent (first 1000 chars)
- ✅ **Responses** - What agent returned (first 1000 chars)

## 🔍 Troubleshooting

### Traces Not Appearing?

1. **Check connection string is set:**
   ```bash
   npx tsx -e "console.log(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ? '✅ Set' : '❌ Not Set')"
   ```

2. **Check console output:**
   - Look for: `✅ OpenTelemetry tracing initialized with Azure Monitor`
   - If you see: `⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not set` → Add the variable

3. **Wait for ingestion:**
   - Traces take 1-5 minutes to appear
   - Refresh the Tracing page

4. **Verify App Insights is connected:**
   - Foundry Portal → Project → Tracing → Should show connected resource

5. **Run diagnostic test:**
   ```bash
   npx tsx test-agent-tracing.ts
   ```

## 📁 Documentation

Full step-by-step guide: [docs/ENABLE_TRACING.md](./ENABLE_TRACING.md)

## 🎯 Current Status

| Item | Status |
|------|--------|
| Agent API Working | ✅ Verified |
| OpenTelemetry Packages | ✅ Installed |
| Tracing Code | ✅ Implemented |
| Build Success | ✅ Complete |
| **Needs Action** | ⚠️ Add Connection String |

## Quick Test

Once you add the connection string and restart:

```bash
# This will generate traces:
npx tsx test-agent-tracing.ts

# Wait 2-3 minutes, then check Foundry portal under Tracing
```

---

**Need help?** See full documentation in [docs/ENABLE_TRACING.md](./ENABLE_TRACING.md)
