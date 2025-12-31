# AsbestosGuard - Quick Deploy Reference

## Single Command Deployment ⚡

### First Time (Create Everything)
```bash
./deploy.sh <resource-group> <webapp-name>
```

### Refresh (Update App Only)
```bash
./deploy.sh <resource-group> <webapp-name> --skip-infrastructure
```

---

## Examples

```bash
# Initial deployment to production
./deploy.sh asbestosguard-rg asbestosguard-prod-webapp

# Refresh deployment (skip infrastructure)
./deploy.sh asbestosguard-rg asbestosguard-prod-webapp --skip-infrastructure

# Deploy to staging environment
./deploy.sh staging-rg staging-webapp --environment staging

# Deploy to different region
./deploy.sh west-rg west-webapp --location westus2
```

---

## Optional Configuration

Create `.env.local` for Azure AI Foundry:
```bash
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
FOUNDRY_AGENT_1_ID=asst_xxxxx
FOUNDRY_AGENT_2_ID=asst_yyyyy
FOUNDRY_AGENT_3_ID=asst_zzzzz
```

---

## Prerequisites

- Node.js 18+
- Azure CLI (logged in)
- Appropriate Azure permissions

**Quick check:**
```bash
./deploy.sh --help
```

---

## What It Does

1. ✅ Validates prerequisites
2. ✅ Creates/updates Azure infrastructure (optional)
3. ✅ Builds the application
4. ✅ Configures settings
5. ✅ Deploys to Azure

---

## After Deployment

**Check health:**
```bash
curl https://your-webapp.azurewebsites.net/api/health
```

**View logs:**
```bash
az webapp log tail --resource-group <rg> --name <webapp>
```

**Visit app:**
```
https://your-webapp.azurewebsites.net
```

---

## Need More Details?

- Full guide: [DEPLOY.md](./DEPLOY.md)
- Azure setup: [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
- Help: `./deploy.sh --help`
