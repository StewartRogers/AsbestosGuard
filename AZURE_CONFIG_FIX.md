# Azure AI Projects SDK - Agent Invocation Fix

## Problem
The bridge service was failing with: `'AgentsOperations' object has no attribute 'create_thread'`

This occurred because `AIProjectClient` was not fully initialized. The SDK requires **subscription ID** and **resource group** parameters to enable the agents API.

## Root Cause
The `AIProjectClient` initialization was missing two critical parameters:
- `subscription_id` - Azure subscription ID
- `resource_group_name` - Azure resource group name

Without these, the agents operations are not fully initialized, and methods like `create_thread()` are not available.

## Solution Implemented

### 1. Updated agent-bridge-service.py
Added the missing parameters to AIProjectClient initialization:

```python
project_client = AIProjectClient(
    credential=DefaultAzureCredential(),
    endpoint=endpoint,
    subscription_id=os.getenv("AZURE_SUBSCRIPTION_ID"),  # REQUIRED
    resource_group_name=os.getenv("AZURE_RESOURCE_GROUP"),  # REQUIRED
    project_name=project_name
)
```

### 2. Updated .env.local
Added the missing environment variables:

```dotenv
AZURE_SUBSCRIPTION_ID=cf1a336f-d853-494e-8202-9bf4f16336e0
AZURE_RESOURCE_GROUP=my-webapp-rg
```

### 3. Enhanced startup logging
Added checks in the bridge service startup to verify these credentials are configured:

```
✅ Azure Subscription ID configured
✅ Azure Resource Group configured
```

## How to Find Your Values

### Option 1: Using Azure CLI
```bash
# Get subscription ID
az account show --query "id" -o tsv

# Get resource group names
az group list --query "[].name" -o tsv
```

### Option 2: Using Azure Portal
1. Go to Azure Portal
2. Search for your AI Foundry resource
3. Click Overview
4. Look for:
   - **Subscription ID** (in the Overview blade)
   - **Resource group** (in the Overview blade)

## Verification
When you start the bridge service, you should see:
```
✅ Azure Subscription ID configured
✅ Azure Resource Group configured
✅ AIProjectClient created successfully
📝 Creating agent thread...
   Thread ID: thread_abc123...
```

If you see warnings, add the missing values to .env.local.

## Files Changed
1. `agent-bridge-service.py` - Updated AIProjectClient initialization and added startup logging
2. `.env.local` - Added AZURE_SUBSCRIPTION_ID and AZURE_RESOURCE_GROUP

## Next Steps
Start the bridge service:
```bash
npm run agent-bridge
```

Test agent invocation:
```bash
npm run test:foundry
```
