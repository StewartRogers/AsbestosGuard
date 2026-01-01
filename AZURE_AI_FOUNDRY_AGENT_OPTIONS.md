# Azure AI Foundry Agent Implementation Options

**Date:** December 31, 2025  
**Your Project:** rsrogers-8077

## Current Situation Summary

You have **Azure AI Foundry native agents** in your project:
- **EFSAGENT** (Employee/Facility Safety - gpt-4.1-mini)
- **APPRISKANALYSIS** (Application Risk Analysis - gpt-4.1)
- **EMPWEBPROFILEAGENT** (Web Profile Search - gpt-4.1)

However, your codebase uses **OpenAI Assistants API REST endpoints** (`/threads/.../runs` with `assistant_id`), which **ONLY work with OpenAI Assistants format agents** (IDs starting with `asst_`).

---

## The Problem

**Azure AI Foundry has TWO types of agents:**

### 1. Azure AI Foundry Native Agents
- **IDs:** `EFSAGENT`, `APPRISKANALYSIS`, etc.
- **API Access:** Via Microsoft Agent Framework SDK only
- **REST API:** No direct REST endpoint for invocation
- **Found in:** `GET /agents` endpoint
- **Cannot be used with:** `/threads/.../runs` REST API

### 2. OpenAI Assistants API Format Agents  
- **IDs:** `asst_WfzpVc2VFNSOimWtPFeH2M8A`, `asst_oKyLyTufq0RUcImmv4Wordy7`, etc.
- **API Access:** Via REST API (`/threads`, `/runs`, `/messages`)
- **Found in:** `GET /openai/assistants` endpoint (if they exist)
- **Can be used with:** Direct REST API calls (your current approach)

---

## Your Options

### Option 1: Find Your Existing OpenAI Assistants (RECOMMENDED FOR REST API)

According to your `ARCHITECTURE_DIAGRAM.txt`, you previously had OpenAI Assistants:
- `asst_WfzpVc2VFNSOimWtPFeH2M8A` (EFSAGENT)
- `asst_oKyLyTufq0RUcImmv4Wordy7` (EMPWEBPROFILEAGENT)
- `asst_dgZab8X0Y28EMqKpT9DbwBmb` (APPRISKANALYSIS)

**Check if they still exist:**
```bash
# Run the find-openai-assistants.ts script
npx tsx find-openai-assistants.ts
```

**If they exist:** Update `.env.local` with the `asst_xxx` IDs and you're done!

**If they don't exist:** They may have been deleted. You'll need to recreate them or choose Option 2/3.

---

### Option 2: Create New OpenAI Assistants via REST API

You can create OpenAI Assistants programmatically:

```typescript
// POST https://rsrogers-8077-resource.services.ai.azure.com/api/projects/rsrogers-8077/openai/assistants?api-version=2025-05-15-preview
const response = await fetch(`${endpoint}/openai/assistants?api-version=2025-05-15-preview`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4.1-mini',
    name: 'EFSAGENT',
    instructions: 'You are a regulatory compliance analyst...',
    tools: []
  })
});

// Returns: { id: 'asst_xxxxxxxxxxxxx', ... }
```

**Pros:**
- Pure REST API (no SDK needed)
- Works with your existing code
- You control the agent configuration

**Cons:**
- Need to manually create assistants
- Duplicates your existing native agents
- More code to maintain

---

### Option 3: Use Microsoft Agent Framework SDK

Install the SDK and use native agents directly:

**Python:**
```bash
pip install agent-framework-azure-ai --pre
```

**Python Code:**
```python
from agents import Agent, AzureAIConfig

config = AzureAIConfig(
    endpoint="https://rsrogers-8077-resource.services.ai.azure.com",
    project="rsrogers-8077"
)

agent = Agent(agent_id="EFSAGENT", config=config)
response = agent.invoke("Analyze this application...")
```

**.NET:**
```bash
dotnet add package Microsoft.Agents.AI.AzureAI --prerelease
```

**.NET Code:**
```csharp
var config = new AzureAIConfig {
    Endpoint = "https://rsrogers-8077-resource.services.ai.azure.com",
    Project = "rsrogers-8077"
};

var agent = new Agent("EFSAGENT", config);
var response = await agent.InvokeAsync("Analyze this application...");
```

**Pros:**
- Official Microsoft SDK
- Direct support for native agents
- Future-proof
- Better error handling and features

**Cons:**
- Requires installing SDK
- Need to refactor from REST to SDK calls
- Additional dependency

---

### Option 4: Use Azure AI Foundry Portal to Create OpenAI Assistants

1. Go to https://ai.azure.com/
2. Navigate to your project: rsrogers-8077
3. Click "Assistants" (not "Agents")
4. Create new assistants with OpenAI format
5. Copy the `asst_xxx` IDs to `.env.local`

**Pros:**
- No code changes
- Visual interface
- Easy to manage

**Cons:**
- Manual setup
- Need to recreate agent configurations

---

## Recommended Approach

**For your situation (wanting REST API only):**

1. **First, check if your old OpenAI assistants exist:**
   ```bash
   npx tsx find-openai-assistants.ts
   ```

2. **If they exist:**
   - Update `.env.local` with the `asst_xxx` IDs
   - Done! Your code will work as-is

3. **If they don't exist:**
   - Create them via Azure AI Foundry Portal (Option 4) - easiest
   - OR create them via REST API (Option 2) - more automated
   - Update `.env.local` with the new IDs

**Long-term recommendation:**
Consider migrating to Microsoft Agent Framework SDK (Option 3) when you have time. It's the official path forward and provides better support for Azure AI Foundry native agents.

---

## What Your Code Currently Does

```typescript
// 1. Lists Azure AI Foundry native agents
GET /agents?api-version=xxx
// Returns: [{ id: "EFSAGENT", ... }, ...]

// 2. Tries to invoke via /invoke (doesn't exist)
POST /agents/EFSAGENT/invoke?api-version=xxx  
// Returns: 404 Not Found

// 3. Falls back to OpenAI Assistants API
POST /threads?api-version=xxx
POST /threads/{id}/messages?api-version=xxx
POST /threads/{id}/runs?api-version=xxx
// Body: { assistant_id: "EFSAGENT" }
// Returns: 400 Bad Request "Expected an ID that begins with 'asst'"
```

---

## Updated Code Structure

I've updated your `foundryAgentClient.ts` to:

1. **Try Azure AI Foundry native agent invocation first** (attempts `/agents/{id}/invoke`)
2. **Fall back to OpenAI Assistants API** (uses `/threads/.../runs`)
3. **Cache agent lookups** to avoid repeated API calls
4. **Resolve agent names to IDs** automatically

However, the native invocation doesn't exist, so it will always fall back to OpenAI Assistants API, which requires `asst_xxx` IDs.

---

## Next Steps

### Immediate (Test if old assistants exist):
```bash
npx tsx find-openai-assistants.ts
```

### If assistants exist:
```bash
# Update .env.local with the asst_xxx IDs
# Then test:
npm run test:foundry-analysis
```

### If assistants don't exist:
Choose one of the options above and implement it.

---

## Questions to Answer

1. **Do you want to stick with REST API only?**
   - YES → Use Option 1 or 2 (find/create OpenAI assistants)
   - NO → Use Option 3 (install SDK)

2. **Do you need the exact same agent configurations?**
   - YES → Recreate assistants with same instructions
   - NO → Create new assistants with updated config

3. **How much time do you have?**
   - Quick fix → Option 4 (Portal creation)
   - Proper solution → Option 3 (SDK migration)

---

## File Changes Summary

**Updated Files:**
- `services/foundryAgentClient.ts` - Added native agent invocation attempt (with fallback)
- `.env.local` - Added documentation about agent types
- `test-agent-lookup.ts` - Tests agent name-to-ID resolution
- `debug-agents-list.ts` - Shows full agent response structure  
- `find-openai-assistants.ts` - Searches for OpenAI Assistants

**New Scripts:**
- `npm run test:agent-lookup` - Test agent resolution
- `npx tsx debug-agents-list.ts` - Debug agent list structure
- `npx tsx find-openai-assistants.ts` - Find OpenAI assistants

---

## Contact & Resources

- **Azure AI Foundry Portal:** https://ai.azure.com/
- **Your Project:** https://ai.azure.com/projects/rsrogers-8077
- **Microsoft Agent Framework:** https://github.com/microsoft/agent-framework
- **Documentation:** https://learn.microsoft.com/azure/ai-services/

