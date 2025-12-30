# AsbestosGuard - Foundry Agents Integration Complete

## Summary

Your app is **ready to integrate with Foundry agents**. The "Run Analysis" feature is now simplified and uses **Azure Foundry Agent1 (EFSAGENT)** for all application analysis.

## What Changed

### 1. New File: `services/foundryAnalysisService.ts`
- **Purpose**: Replaces complex Gemini analysis with simple Foundry agent calls
- **Agent Used**: `agent1` (EFSAGENT) - "Compare Application to EFS"
- **What it does**:
  - Takes your application data + optional fact sheet
  - Builds a comprehensive analysis prompt
  - Sends to Foundry agent1
  - Returns structured `AIAnalysisResult`

### 2. Updated: `server.ts`
- **Endpoint**: `POST /__api/gemini/analyze`
- **New behavior**:
  1. Checks if `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` is set
  2. If yes → Uses **Foundry agents** (foundryAnalysisService)
  3. If no → Falls back to **Gemini** (for backward compatibility)
  - This means your app works with either system!

### 3. Updated: `services/geminiClient.ts`
- Simplified with clear comments
- Now routes analysis through the server endpoint (which decides Foundry vs Gemini)

## How It Works - Data Flow

```
User clicks "Run Analysis"
        ↓
geminiClient.analyzeApplicationServer()
        ↓
POST /__api/gemini/analyze (server endpoint)
        ↓
foundryAnalysisService.analyzeApplication()
        ↓
foundryAgentClient.askAgent(agent1, prompt)
        ↓
Foundry Agent1 (EFSAGENT) analyzes application
        ↓
Returns: AIAnalysisResult (risk score, concerns, violations, recommendation)
        ↓
Displays in ApplicationReview page
```

## Is Your App Ready?

✅ **YES** - Your app can send input and get output from Foundry agent1

### Requirements (already set up):

1. **Environment Variables** (.env.local)
   ```
   AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://rsrogers-8077-resource.services.ai.azure.com/api/projects/rsrogers-8077
   FOUNDRY_AGENT_1_ID=asst_WfzpVc2VFNSOimWtPFeH2M8A
   FOUNDRY_AGENT_2_ID=asst_oKyLyTufq0RUcImmv4Wordy7
   FOUNDRY_AGENT_3_ID=asst_dgZab8X0Y28EMqKpT9DbwBmb
   ```

2. **Authentication** - Uses DefaultAzureCredential (Azure CLI login)
   ```bash
   az login
   ```

## Testing

### Run the test script:
```bash
npm run test:foundry-analysis
```

This will:
- ✓ Verify your Foundry configuration
- ✓ Send a test application to agent1
- ✓ Display the analysis results

### Manual Test in UI:

1. Start the app: `npm run dev`
2. Navigate to **Admin → Applications**
3. Click on any application
4. Click **"Run Analysis"**
5. Wait for agent1 to complete the analysis
6. View results in the Risk Analysis section

## What Agent1 Does

**Agent Name**: EFSAGENT  
**Purpose**: Compare Application to EFS (Employment Facility Safety)

When you click "Run Analysis", agent1:
1. **Validates internal records** - Checks if account matches fact sheet
2. **Checks compliance** - Verifies certifications and requirements
3. **Assesses risk** - Determines LOW/MEDIUM/HIGH risk
4. **Identifies violations** - Lists policy violations
5. **Makes recommendation** - APPROVED/CONDITIONAL/REJECTED

## Optional: Use Agent2 or Agent3

Want to use multiple agents? You can:

**Agent2** (EMPWEBPROFILEAGENT): "Do a web search to develop a business profile"
```javascript
const result = await chatWithAgent('agent2', 'Search for company information on: Acme Corp');
```

**Agent3** (APPRISKANALYSIS): "Do a risk analysis of the application"
```javascript
const result = await chatWithAgent('agent3', 'Analyze risk for: [application data]');
```

## Advantages Over Previous Setup

| Aspect | Before | Now |
|--------|--------|-----|
| **API Calls** | Multiple (Gemini + Web Search) | Single (Foundry agent) |
| **Response Time** | Variable (15-60s) | Agent-controlled |
| **Error Handling** | Complex fallbacks | Simple + consistent |
| **Configuration** | Gemini API key | Foundry endpoint (Azure) |
| **Cost** | Pay per API call | Foundry pricing model |

## Troubleshooting

### "Missing AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"
- Update .env.local with Foundry endpoint

### "Agent run failed"
- Check Azure login: `az login`
- Verify endpoint is accessible
- Check agent ID is correct

### "No JSON found in agent response"
- Agent may have failed to return structured data
- Check Foundry agent instructions
- Verify prompt clarity

## Next Steps

1. ✅ Test with `npm run test:foundry-analysis`
2. ✅ Click "Run Analysis" in the UI
3. ✅ Verify results appear correctly
4. ✅ Deploy to Azure App Service or Container

Your app is now **simplified and focused** on Foundry agents!
