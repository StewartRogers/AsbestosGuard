# Fix: Invalid Agent ID Error

## Problem
```
Invalid 'assistant_id': 'EMPFACTSHEET'. Expected an ID that begins with 'asst_'.
```

## Root Cause
Your `.env.local` has **friendly agent names** instead of **actual Azure agent IDs**.

- ❌ **Friendly names** (what you configured): `EFSAGENT`, `APPRISKANALYSIS`, `EMPWEBPROFILEAGENT`
- ✅ **Actual IDs** (what Azure needs): `asst_abc123def456...`

Azure AI Foundry agent IDs always start with `asst_` (similar to OpenAI's format).

## Solution

### Step 1: Get Correct Agent IDs
```bash
npm run get:agent-ids
```

This will:
1. Connect to your Azure AI Foundry project
2. List all agents and their actual IDs
3. Show you exactly what to put in `.env.local`

**Output example:**
```
═════════════════════════════════════════════════════════════════════════════════
Agent 1:
  Name: EFSAGENT
  ID:   asst_abc123def456xyz789
  env:  FOUNDRY_AGENT_1_ID=asst_abc123def456xyz789

Agent 2:
  Name: APPRISKANALYSIS
  ID:   asst_xyz789abc123def456
  env:  FOUNDRY_AGENT_2_ID=asst_xyz789abc123def456

Agent 3:
  Name: EMPWEBPROFILEAGENT
  ID:   asst_def456xyz789abc123
  env:  FOUNDRY_AGENT_3_ID=asst_def456xyz789abc123
```

### Step 2: Update .env.local
Replace these lines:
```env
# WRONG - these are friendly names, not IDs
FOUNDRY_AGENT_1_ID=EFSAGENT
FOUNDRY_AGENT_2_ID=APPRISKANALYSIS
FOUNDRY_AGENT_3_ID=EMPWEBPROFILEAGENT
```

With the actual IDs from the output above:
```env
# CORRECT - these are actual Azure agent IDs
FOUNDRY_AGENT_1_ID=asst_abc123def456xyz789
FOUNDRY_AGENT_2_ID=asst_xyz789abc123def456
FOUNDRY_AGENT_3_ID=asst_def456xyz789abc123
```

### Step 3: Restart Bridge Service
```bash
# Kill the old bridge service (Ctrl+C if running)

# Start it again - now with correct IDs
npm run agent-bridge
```

You should see:
```
📋 Configured agents: asst_abc123def456xyz789, asst_xyz789abc123def456, asst_def456xyz789abc123
```

### Step 4: Test Agent
```bash
npm run test:real-agent
```

Should now work without the "Invalid assistant_id" error.

---

## Why This Happened

1. You configured agent **names** instead of agent **IDs**
2. The bridge service passed these to Azure's API
3. Azure requires IDs starting with `asst_`
4. API rejected with: "Invalid 'assistant_id': 'EMPFACTSHEET'. Expected an ID that begins with 'asst_'."

## Key Difference

| Type | Example | Format |
|------|---------|--------|
| **Agent Name** (friendly, for display) | EFSAGENT | No specific format |
| **Agent ID** (technical, for API) | asst_abc123def456... | Always starts with `asst_` |

Azure's API needs the **ID**, not the **Name**.

## Verification

Your `.env.local` should have IDs like:
```env
FOUNDRY_AGENT_1_ID=asst_...  ✅ Correct format
FOUNDRY_AGENT_1_ID=EFSAGENT   ❌ Wrong - this is a name, not an ID
```

All three FOUNDRY_AGENT_*_ID values must start with `asst_`.

## Need Help?

If `npm run get:agent-ids` doesn't work:

1. **Verify Azure Login:**
   ```bash
   az account show
   ```
   Should show your subscription. If not, run: `az login`

2. **Verify Project Endpoint:**
   ```bash
   echo $env:AZURE_AI_FOUNDRY_PROJECT_ENDPOINT
   ```
   Should show your Foundry project endpoint

3. **Check Agents Exist:**
   - Go to Azure Portal
   - Navigate to your AI Foundry project
   - Check "Agents" section
   - Confirm agents are created

4. **Get IDs Manually:**
   - Azure Portal → Your Project → Agents
   - Click on each agent
   - Copy the ID (starts with `asst_`)
   - Update `.env.local`

