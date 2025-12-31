# Migration Guide: Old Deployment Scripts → New Unified Script

## Overview

AsbestosGuard has been simplified to use **a single deployment script** (`deploy.sh`) that handles all deployment scenarios. This guide helps you migrate from the old scripts to the new unified approach.

## What Changed?

### Before (Multiple Scripts)
- `deploy-simple.sh` - Simple deployment
- `deploy-all.sh` - Full deployment with infrastructure
- `deploy-to-azure.ps1` - PowerShell deployment
- `deploy-simple.ps1` - PowerShell simple deployment
- `deploy-azure-config.ps1` - Infrastructure configuration

### After (Single Script)
- **`deploy.sh`** - Unified script for all scenarios

## Migration Examples

### Scenario 1: Simple Application Deployment

**Old Way:**
```bash
./deploy-simple.sh my-rg my-webapp AIzaSyD...
```

**New Way:**
```bash
# First time (with infrastructure)
./deploy.sh my-rg my-webapp

# Refresh (app only)
./deploy.sh my-rg my-webapp --skip-infrastructure
```

### Scenario 2: Full Deployment with Infrastructure

**Old Way:**
```bash
# Step 1: Deploy infrastructure
az deployment group create \
  --resource-group my-rg \
  --template-file infrastructure/main.bicep \
  --parameters appName=asbestosguard

# Step 2: Deploy app
./deploy-simple.sh my-rg my-webapp YOUR_API_KEY
```

**New Way:**
```bash
# Single command does both!
./deploy.sh my-rg my-webapp
```

### Scenario 3: PowerShell Deployment (Windows)

**Old Way:**
```powershell
.\deploy-to-azure.ps1 -ResourceGroup my-rg -WebAppName my-webapp
```

**New Way:**
```bash
# Use bash script (works on Windows with Git Bash or WSL)
./deploy.sh my-rg my-webapp --skip-infrastructure
```

### Scenario 4: Infrastructure Only

**Old Way:**
```powershell
.\deploy-azure-config.ps1 -ResourceGroup my-rg -StorageAccountName storage -WebAppName webapp -GeminiApiKey key
```

**New Way:**
```bash
# Infrastructure is deployed automatically, but you can deploy infrastructure only:
./deploy.sh my-rg my-webapp --skip-build
```

## Feature Comparison

| Feature | Old Scripts | New Script |
|---------|-------------|------------|
| Single command | ❌ Multiple scripts | ✅ One script |
| Infrastructure deployment | ❌ Separate step | ✅ Integrated |
| Prerequisite validation | ⚠️ Partial | ✅ Complete |
| Environment selection | ❌ Manual parameters | ✅ Built-in flags |
| Configuration from .env.local | ⚠️ Some scripts | ✅ All scenarios |
| Clear progress reporting | ⚠️ Varies | ✅ Consistent |
| Help documentation | ❌ Scattered | ✅ Built-in --help |

## Configuration Changes

### Azure AI Foundry Settings

**Old Way (multiple approaches):**
- Sometimes in Bicep parameters
- Sometimes as script arguments
- Sometimes in .env files

**New Way (unified):**
```bash
# Create .env.local with your settings
cat > .env.local << EOF
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
FOUNDRY_AGENT_1_ID=asst_xxxxx
FOUNDRY_AGENT_2_ID=asst_yyyyy
FOUNDRY_AGENT_3_ID=asst_zzzzz
EOF

# Deploy - settings are automatically picked up
./deploy.sh my-rg my-webapp
```

## Quick Reference

### New Script Options

```bash
./deploy.sh <resource-group> <webapp-name> [options]

Options:
  --skip-infrastructure    Skip infrastructure deployment (refresh mode)
  --skip-build            Skip building the application
  --app-name <name>       Application name for Bicep
  --environment <env>     Environment (dev|staging|prod)
  --location <location>   Azure location
  --help                  Show help
```

### Common Commands

```bash
# First deployment
./deploy.sh my-rg my-webapp

# Refresh deployment
./deploy.sh my-rg my-webapp --skip-infrastructure

# Deploy to staging
./deploy.sh staging-rg staging-webapp --environment staging

# Get help
./deploy.sh --help
```

## Benefits of the New Approach

1. **Simplicity**: One script to learn instead of five
2. **Consistency**: Same experience for all scenarios
3. **Less Confusion**: Clear what to use and when
4. **Better Validation**: Comprehensive prerequisite checks
5. **Easier to Maintain**: Single source of truth
6. **Self-Documenting**: Built-in help and examples
7. **Fewer Errors**: Integrated workflow reduces mistakes

## Backward Compatibility

The old scripts are still present but deprecated. They will:
1. Show a deprecation warning
2. Suggest the new command to use
3. Ask for confirmation before proceeding
4. Work as before if you confirm

This gives you time to migrate at your own pace.

## Getting Help

- **Quick start**: See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
- **Full guide**: See [DEPLOY.md](./DEPLOY.md)
- **Built-in help**: Run `./deploy.sh --help`
- **Azure details**: See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)

## Troubleshooting Migration

### "I used to pass API keys as arguments"

**Old:**
```bash
./deploy-simple.sh my-rg my-webapp AIzaSyD...
```

**New:**
Put API keys in `.env.local` or set as environment variables. The deployment script uses Azure Managed Identity, so API keys aren't required in the deployment command.

### "I have a custom build process"

Use `--skip-build` flag:
```bash
# Build your way
npm run my-custom-build

# Deploy without rebuilding
./deploy.sh my-rg my-webapp --skip-infrastructure --skip-build
```

### "I need to deploy to multiple environments"

Use the `--environment` flag:
```bash
./deploy.sh dev-rg dev-webapp --environment dev
./deploy.sh staging-rg staging-webapp --environment staging
./deploy.sh prod-rg prod-webapp --environment prod
```

### "I'm on Windows and prefer PowerShell"

The new bash script works on Windows with:
- Git Bash (comes with Git for Windows)
- WSL (Windows Subsystem for Linux)
- Windows Terminal with bash

Or continue using the old PowerShell scripts (they'll show deprecation warnings but still work).

## Timeline

- **Now**: New unified script available, old scripts deprecated
- **Future**: Old scripts may be removed in a future version

We recommend migrating to the new script at your earliest convenience.

## Questions?

If you have questions about the migration or encounter issues:
1. Run `./deploy.sh --help`
2. Check [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
3. Review [DEPLOY.md](./DEPLOY.md)
4. Check the troubleshooting section above
