# Infrastructure as Code - Bicep Templates

This directory contains Azure Bicep templates for automated infrastructure provisioning.

## Overview

The Bicep templates automatically create and configure all Azure resources needed for AsbestosGuard:

- **Storage Account** with blob containers (applications, fact-sheets, analysis, policies, data)
- **App Service Plan** (Linux-based, configurable tier)
- **Web App** with Node.js 18 runtime
- **Managed Identity** for secure access to storage
- **Application Insights** for monitoring
- **Role Assignments** for proper permissions

## Files

- `main.bicep` - Main template defining all resources
- `main.parameters.json` - Example parameters file (⚠️ **Template only** - update with your values before use)

## Quick Start

### 1. Update Parameters

**Important:** The `main.parameters.json` file is a template. Copy it and update with your actual values:

```bash
# Copy the template (optional - you can edit in place)
cp main.parameters.json main.parameters.local.json

# Edit with your actual values
# Replace REPLACE_WITH_YOUR_GEMINI_API_KEY with your real API key
```

Edit the parameters file:

```json
{
  "appName": { "value": "asbestosguard" },
  "environment": { "value": "prod" },
  "geminiApiKey": { "value": "YOUR_ACTUAL_API_KEY" },
  "appServicePlanSku": { "value": "B1" }
}
```

**Note:** Never commit files containing real API keys to version control.

### 2. Deploy Infrastructure

```bash
# Create resource group
az group create \
  --name asbestosguard-rg \
  --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group asbestosguard-rg \
  --template-file main.bicep \
  --parameters main.parameters.json
```

### 3. Get Outputs

```bash
az deployment group show \
  --resource-group asbestosguard-rg \
  --name main \
  --query properties.outputs
```

Outputs include:
- `webAppUrl` - Your application URL
- `webAppName` - Web app name for deployment
- `storageAccountName` - Storage account name
- `applicationInsightsInstrumentationKey` - App Insights key
- `applicationInsightsConnectionString` - App Insights connection

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `appName` | string | Base name for all resources (e.g., "asbestosguard") |
| `geminiApiKey` | securestring | Google Gemini API key for AI features |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | Resource group location | Azure region |
| `environment` | string | `dev` | Environment name (dev/staging/prod) |
| `appServicePlanSku` | string | `B1` | App Service Plan tier (F1/B1/S1/P1v2) |

## App Service Plan SKUs

| SKU | Name | Monthly Cost | Use Case |
|-----|------|--------------|----------|
| F1 | Free | $0 | Testing/demo (no AlwaysOn) |
| B1 | Basic | ~$13 | Development, small apps |
| S1 | Standard | ~$70 | Production, auto-scaling |
| P1v2 | Premium | ~$100+ | High-performance production |

## What Gets Created

### Resource Naming Convention

Resources are named: `{appName}-{environment}-{resource-type}`

Example with `appName=asbestosguard` and `environment=prod`:
- Storage: `asbestosguardprodstorage`
- App Plan: `asbestosguard-prod-plan`
- Web App: `asbestosguard-prod-webapp`
- Insights: `asbestosguard-prod-insights`

### Storage Account

- **Type:** StorageV2 (General Purpose v2)
- **Replication:** LRS (Locally Redundant Storage)
- **Access tier:** Hot
- **HTTPS only:** Enabled
- **TLS version:** 1.2 minimum
- **Public blob access:** Disabled (secure by default)
- **Soft delete:** 7-day retention
- **Containers:** applications, fact-sheets, analysis, policies, data

### Web App Configuration

- **Runtime:** Node.js 18 LTS
- **OS:** Linux
- **HTTPS only:** Enabled
- **FTPS:** Disabled
- **Managed Identity:** System-assigned
- **Always On:** Enabled (except Free tier)

### Environment Variables (Auto-configured)

These are automatically set in the Web App:
- `AZURE_STORAGE_ACCOUNT_NAME`
- `GEMINI_API_KEY`
- `NODE_ENV=production`
- `WEBSITE_NODE_DEFAULT_VERSION=18-lts`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`

### Security Features

✅ **Managed Identity enabled** - No credentials in code
✅ **Storage permissions** - Web App has "Storage Blob Data Contributor" role
✅ **HTTPS only** - No unencrypted traffic
✅ **TLS 1.2 minimum** - Secure connections
✅ **Private containers** - No public blob access
✅ **Secrets as parameters** - API keys marked as `@secure()`

## Advanced Usage

### Deploy with Inline Parameters

```bash
az deployment group create \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters \
    appName=asbestosguard \
    environment=prod \
    geminiApiKey=YOUR_KEY \
    appServicePlanSku=S1
```

### Deploy to Multiple Environments

```bash
# Development
az deployment group create \
  --resource-group dev-rg \
  --template-file main.bicep \
  --parameters appName=asbestosguard environment=dev geminiApiKey=$DEV_KEY appServicePlanSku=F1

# Production
az deployment group create \
  --resource-group prod-rg \
  --template-file main.bicep \
  --parameters appName=asbestosguard environment=prod geminiApiKey=$PROD_KEY appServicePlanSku=S1
```

### What-If Deployment (Preview Changes)

```bash
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.parameters.json
```

### Validate Template

```bash
az deployment group validate \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.parameters.json
```

## Updating Infrastructure

To update existing infrastructure:

```bash
# Bicep is idempotent - just run deployment again
az deployment group create \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.parameters.json
```

Bicep will:
- ✅ Update resources that changed
- ✅ Leave unchanged resources alone
- ✅ Add new resources
- ⚠️ Delete resources only if removed from template

## Clean Up Resources

```bash
# Delete entire resource group (careful!)
az group delete --name my-rg --yes --no-wait

# Or delete specific deployment
az deployment group delete --resource-group my-rg --name main
```

## Customization

### Add Custom Settings

Edit `main.bicep` to add more app settings:

```bicep
appSettings: [
  // ... existing settings
  {
    name: 'MY_CUSTOM_SETTING'
    value: 'custom-value'
  }
]
```

### Change Storage Account Type

```bicep
sku: {
  name: 'Standard_GRS'  // Geo-redundant storage
}
```

### Add Custom Domain

```bicep
hostNames: [
  'www.example.com'
]
```

### Enable Backup

```bicep
properties: {
  // ... existing properties
  siteConfig: {
    // ... existing config
    backupSchedule: {
      frequencyInterval: 1
      frequencyUnit: 'Day'
      keepAtLeastOneBackup: true
      retentionPeriodInDays: 7
    }
  }
}
```

## Troubleshooting

### Deployment fails with "name already exists"

Storage account names must be globally unique. Change the `appName` parameter.

### "Principal does not exist" error

Wait 30-60 seconds after enabling Managed Identity before assigning roles. Add a delay:

```bash
sleep 60
```

### Can't deploy to Free tier

Free tier (F1) has limitations:
- No AlwaysOn
- Limited compute
- No auto-scaling

The template handles this automatically.

### Need to update API key

```bash
az webapp config appsettings set \
  --resource-group my-rg \
  --name my-webapp \
  --settings GEMINI_API_KEY=NEW_KEY
```

## Best Practices

✅ **Use Managed Identity** - Included by default
✅ **Separate environments** - Use different resource groups
✅ **Use Key Vault for secrets** - For advanced scenarios
✅ **Enable monitoring** - Application Insights included
✅ **Use what-if** - Preview changes before deployment
✅ **Tag resources** - Add tags for cost tracking
✅ **Implement CI/CD** - Automate with GitHub Actions

## Next Steps

After infrastructure is deployed:

1. Deploy the application:
   ```bash
   cd ..
   ./deploy-simple.sh my-rg my-webapp-name YOUR_API_KEY
   ```

2. Verify deployment:
   ```bash
   curl https://my-webapp-name.azurewebsites.net/api/health
   ```

3. Set up monitoring in Azure Portal → Application Insights

4. Configure GitHub Actions for automated deployments

## Support

- **Azure Bicep Documentation:** https://learn.microsoft.com/azure/azure-resource-manager/bicep/
- **Azure CLI Reference:** https://learn.microsoft.com/cli/azure/
- **Main Deployment Guide:** [../DEPLOY.md](../DEPLOY.md)
