# AsbestosGuard - Quick Deployment Guide

This guide provides the **easiest and fastest** way to deploy AsbestosGuard to Azure using our **unified deployment script**.

## 🚀 Quick Start - Single Unified Script (Recommended)

AsbestosGuard now uses **one script** for all deployment scenarios, making Azure deployment simple and consistent.

### First-Time Deployment (Creates Everything)

```bash
./deploy.sh <resource-group> <webapp-name>
```

**Example:**
```bash
./deploy.sh asbestosguard-rg asbestosguard-prod-webapp
```

This script will:
- ✅ Validate prerequisites (Node.js, Azure CLI, required files)
- ✅ Deploy Azure infrastructure (Storage, App Service, Application Insights)
- ✅ Configure Managed Identity and permissions
- ✅ Install dependencies
- ✅ Build the application
- ✅ Configure Azure settings
- ✅ Deploy to Azure

**Time:** ~10 minutes

---

### Refresh Deployment (Updates App Only)

For subsequent deployments after infrastructure is already set up:

```bash
./deploy.sh <resource-group> <webapp-name> --skip-infrastructure
```

**Example:**
```bash
./deploy.sh asbestosguard-rg asbestosguard-prod-webapp --skip-infrastructure
```

This will:
- ✅ Skip infrastructure deployment (use existing resources)
- ✅ Rebuild the application
- ✅ Deploy updated code to Azure

**Time:** ~5 minutes

---

### Advanced Options

The unified script supports additional options:

```bash
./deploy.sh <resource-group> <webapp-name> [options]

Options:
  --skip-infrastructure    Skip Bicep infrastructure deployment (use for refresh)
  --skip-build            Skip building the application
  --app-name <name>       Application name for Bicep (default: asbestosguard)
  --environment <env>     Environment (dev|staging|prod, default: prod)
  --location <location>   Azure location (default: eastus)
  --help                  Show help message
```

**Examples:**

```bash
# Deploy to staging environment
./deploy.sh staging-rg my-webapp --environment staging

# Deploy to specific location
./deploy.sh my-rg my-webapp --location westus2

# Quick refresh (skip build if already built)
./deploy.sh my-rg my-webapp --skip-infrastructure --skip-build
```

---

### Configuration (Optional)

For Azure AI Foundry integration, create a `.env.local` file:

```bash
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
FOUNDRY_AGENT_1_ID=asst_your_agent_1_id
FOUNDRY_AGENT_2_ID=asst_your_agent_2_id
FOUNDRY_AGENT_3_ID=asst_your_agent_3_id
```

The deployment script will automatically include these settings if present.

---

## Alternative Deployment Options

### Option A: GitHub Actions (Automated CI/CD)

**Setup (one-time):**

1. Get your Web App publish profile:
   ```bash
   az webapp deployment list-publishing-profiles \
     --resource-group my-rg \
     --name my-webapp \
     --xml
   ```

2. Add to GitHub Secrets:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secret: `AZURE_WEBAPP_PUBLISH_PROFILE` (paste the XML content)
   - Add secret: `AZURE_WEBAPP_NAME` (your web app name)

3. Push to main branch - automatic deployment!

The workflow (`.github/workflows/azure-deploy.yml`) automatically:
- ✅ Builds on every push to main
- ✅ Runs tests
- ✅ Deploys to Azure
- ✅ Zero manual steps needed

---

### Option B: Docker Container Deployment

**Build and run locally:**
```bash
docker build -t asbestosguard .
docker run -p 8080:8080 \
  -e AZURE_STORAGE_ACCOUNT_NAME=your_storage \
  asbestosguard
```

**Deploy to Azure Container Instances:**
```bash
az container create \
  --resource-group my-rg \
  --name asbestosguard \
  --image asbestosguard:latest \
  --dns-name-label asbestosguard \
  --ports 8080
```

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ **Node.js 18+** installed
- ✅ **Azure CLI** installed and logged in (`az login`)
- ✅ **Azure subscription** with permissions to create resources
- ✅ **Git** (for version control)

**Quick validation:**
```bash
./validate-deployment.sh
```

---

## 🔐 Required Environment Variables

The deployment script handles most configuration automatically. For Azure AI Foundry integration, optionally configure:

| Variable | Description |
|----------|-------------|
| `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` | Azure AI Foundry project endpoint |
| `FOUNDRY_AGENT_1_ID` | Agent 1 assistant ID |
| `FOUNDRY_AGENT_2_ID` | Agent 2 assistant ID |
| `FOUNDRY_AGENT_3_ID` | Agent 3 assistant ID |

Place these in `.env.local` and the deployment script will use them automatically.

---

## 🎯 Recommended Deployment Flow

**For first-time deployment:**

1. **Run the unified deployment script:**
   ```bash
   ./deploy.sh my-resource-group my-webapp-name
   ```

2. **Set up GitHub Actions** for future automatic deployments

**For updates:**
- Just push to main branch (if GitHub Actions is configured)
- Or run: `./deploy.sh my-rg my-webapp --skip-infrastructure`

---

## 🔍 Verification

After deployment:

1. **Check health endpoint:**
   ```bash
   curl https://your-app.azurewebsites.net/api/health
   ```

2. **View logs:**
   ```bash
   az webapp log tail --resource-group my-rg --name my-webapp
   ```

3. **Test the application:**
   - Visit: `https://your-app.azurewebsites.net`
   - Create a test application entry
   - Verify storage works

---

## 🆘 Troubleshooting

### Build fails locally
```bash
npm install
npm run build
```

### Azure CLI not logged in
```bash
az login
az account show
```

### Deployment succeeds but app doesn't work
- Check Application Settings in Azure Portal
- Verify environment variables are set correctly
- Check logs: `az webapp log tail --resource-group my-rg --name my-webapp`

### Storage errors
- Verify Managed Identity has "Storage Blob Data Contributor" role
- Check that infrastructure deployment completed successfully

---

## 📚 Additional Resources

- **[Detailed Azure Guide](./AZURE_DEPLOYMENT.md)** - Step-by-step manual setup reference
- **[Infrastructure as Code](./infrastructure/main.bicep)** - Bicep template details
- **[GitHub Actions Workflow](.github/workflows/azure-deploy.yml)** - CI/CD configuration
- **[Deployment Improvements](./DEPLOYMENT_IMPROVEMENTS.md)** - What's new and improved

---

## 💰 Cost Estimation

| Service | Tier | Monthly Cost (USD) |
|---------|------|-------------------|
| App Service | B1 (Basic) | ~$13 |
| Storage Account | Standard LRS | ~$1-5 |
| Application Insights | Free tier | $0 |
| **Total** | | **~$14-18** |

For production workloads, consider Standard (S1) tier at ~$70/month.

---

## ✅ Success Checklist

- [ ] Prerequisites installed and verified
- [ ] Azure CLI logged in
- [ ] Deployment script executed successfully
- [ ] Health check returns 200 OK
- [ ] Can access the application
- [ ] Can create/read applications and fact sheets
- [ ] GitHub Actions configured (optional but recommended)

---

**Need help?** Check the troubleshooting section above or review the detailed [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) guide.
