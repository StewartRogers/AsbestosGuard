# How to Enable Tracing for EFSAGENT (agent1)

## Problem
Traces are not showing up in Azure AI Foundry portal for EFSAGENT (agent1), even though the agent is working correctly.

## Diagnosis Results
✅ **Agent is working correctly** - Test confirmed agent responds properly
❌ **Tracing not configured** - No OpenTelemetry instrumentation in code
❌ **Application Insights not connected** - Need to connect to Foundry project

## Solution Overview
To see traces in Foundry portal, you need to:
1. Connect Application Insights to your Foundry project
2. Install OpenTelemetry packages
3. Add instrumentation code to your agent client
4. Set environment variable for Application Insights connection string

---

## Step 1: Connect Application Insights to Your Foundry Project

### In Azure AI Foundry Portal:
1. Go to [Microsoft Foundry Portal](https://ai.azure.com/)
2. Navigate to your project: **rsrogers-8077**
3. In left navigation, click **Tracing** (or **Monitoring**)
4. If no Application Insights is connected:
   - Click **Create new Application Insights resource**
   - OR connect an existing one
5. Copy the **Application Insights Connection String**

### Alternative: Use Existing App Insights
If you already have Application Insights from your infrastructure:
1. Go to Azure Portal
2. Find your Application Insights resource: `asbestosguard-[env]-insights`
3. Go to **Overview** → Copy the **Connection String**
4. In Foundry portal, connect this App Insights to your project

---

## Step 2: Install Required Packages

Add OpenTelemetry packages to your project:

```bash
npm install @azure/monitor-opentelemetry @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/instrumentation
```

---

## Step 3: Add Connection String to Environment

Update your `.env.local` file:

```env
# Existing variables...
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://rsrogers-8077-resource.services.ai.azure.com/api/projects/rsrogers-8077
FOUNDRY_AGENT_1_ID=asst_WfzpVc2VFNSOimWtPFeH2M8A

# Add this - get from Step 1:
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx;IngestionEndpoint=https://...

# Optional: Enable content recording (includes prompts/responses in traces)
# WARNING: May contain sensitive data
AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED=true
```

---

## Step 4: Code Changes Applied

The following files have been updated with tracing instrumentation:
- ✅ `services/foundryAgentClient.ts` - Added OpenTelemetry tracing
- ✅ `services/foundryAnalysisService.ts` - Added span tracking

---

## Step 5: Verify Tracing Works

### Run the test again:
```bash
npx tsx test-agent-tracing.ts
```

### Check traces in Foundry Portal:
1. Go to [Microsoft Foundry Portal](https://ai.azure.com/)
2. Navigate to your project: **rsrogers-8077**
3. Click **Tracing** in left navigation
4. You should see traces appear within 1-5 minutes
5. Filter by:
   - Agent name: EFSAGENT
   - Date range: Last hour
   - Operation: agent.run

### Expected Trace Information:
- **Thread creation**
- **Message addition**
- **Agent run execution**
- **Response retrieval**
- **Token usage**
- **Latency metrics**

---

## Step 6: View Traces in Application Insights (Alternative)

If traces appear in App Insights but not Foundry:

1. Go to Azure Portal
2. Open your Application Insights resource
3. Navigate to **Transaction search** or **Agents (Preview)**
4. Filter by:
   - Time range: Last hour
   - Operation type: agent
5. Click on any trace to see end-to-end details

---

## Troubleshooting

### Traces Still Not Appearing?

#### Check 1: Connection String Valid
```bash
# Run this to verify connection string is set
npx tsx -e "console.log(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ? '✅ Set' : '❌ Not Set')"
```

#### Check 2: Application Insights Connected in Portal
- Foundry Portal → Project → Tracing → Should show connected App Insights name

#### Check 3: Wait Time
- Traces can take 1-5 minutes to appear after execution
- Refresh the Tracing page in Foundry

#### Check 4: Check Console Output
- Look for OpenTelemetry initialization messages when running your app
- Should see: "Instrumenting Azure AI Foundry agent calls..."

#### Check 5: Test with Simple Request
```bash
# Run the diagnostic test
npx tsx test-agent-tracing.ts
```

---

## What Gets Traced?

With tracing enabled, you'll see:
- ✅ **Agent execution timeline** - Step-by-step flow
- ✅ **Token usage** - Input/output tokens per call
- ✅ **Latency** - Time spent in each operation
- ✅ **Errors** - Any failures with stack traces
- ✅ **Tool calls** - If agent uses tools
- ✅ **Model calls** - Underlying LLM invocations
- ✅ **Thread/Run IDs** - For debugging specific conversations

Optional (if AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED=true):
- ✅ **Prompts** - What you sent to the agent
- ✅ **Responses** - What the agent returned
- ⚠️ **Warning**: May contain sensitive data

---

## Next Steps

1. **Set up the connection string** (Step 3)
2. **Deploy with new code** (already instrumented)
3. **Run a test** to generate traces
4. **Check Foundry portal** after 1-5 minutes
5. **Monitor production** usage via Tracing tab

## Additional Resources

- [Azure AI Foundry Tracing Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/trace-agents-sdk)
- [Application Insights Overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [OpenTelemetry for Node.js](https://opentelemetry.io/docs/languages/js/)
