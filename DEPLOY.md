# AsbestosGuard - Quick Deployment Guide

This guide provides the **easiest and fastest** ways to deploy AsbestosGuard to Azure.

## 🚀 Quick Start Options

Choose the deployment method that works best for you:

### Option 1: One-Command Deployment (Easiest)

```bash
./deploy-simple.sh <resource-group> <webapp-name> <gemini-api-key>
```

**Example:**
```bash
./deploy-simple.sh my-rg asbestosguard-webapp AIzaSyD...
```

This script will:
- ✅ Install dependencies
- ✅ Build the application
- ✅ Configure Azure settings
- ✅ Deploy to Azure

**Prerequisites:** Azure CLI installed and logged in

---

### Option 2: Infrastructure + Deployment (Most Complete)

**Step 1: Deploy Infrastructure with Bicep**

```bash
# Create resource group
az group create --name my-rg --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group my-rg \
  --template-file infrastructure/main.bicep \
  --parameters appName=asbestosguard \
               environment=prod \
               geminiApiKey=YOUR_API_KEY
```

This creates:
- ✅ Storage Account with containers
- ✅ App Service Plan
- ✅ Web App with Managed Identity
- ✅ Application Insights
- ✅ Role assignments (automatic storage access)

**Step 2: Deploy Application**

```bash
./deploy-simple.sh my-rg asbestosguard-prod-webapp YOUR_API_KEY
```

---

### Option 3: GitHub Actions (Automated CI/CD)

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

### Option 4: Docker Container Deployment

**Build and run locally:**
```bash
docker build -t asbestosguard .
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
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
  --ports 8080 \
  --environment-variables \
    NODE_ENV=production \
    GEMINI_API_KEY=your_key \
    AZURE_STORAGE_ACCOUNT_NAME=your_storage
```

**Deploy to Azure App Service (Container):**
```bash
# Push to Azure Container Registry
az acr create --name myregistry --resource-group my-rg --sku Basic
az acr build --registry myregistry --image asbestosguard:latest .

# Create web app with container
az webapp create \
  --resource-group my-rg \
  --plan my-plan \
  --name my-webapp \
  --deployment-container-image-name myregistry.azurecr.io/asbestosguard:latest
```

---

### Option 5: PowerShell Script (Windows)

```powershell
.\deploy-to-azure.ps1 `
  -ResourceGroup "my-rg" `
  -WebAppName "my-webapp"
```

Optional flags:
- `-SkipBuild` - Skip the build step
- `-SkipNpmInstall` - Skip npm install

---

## 📋 Pre-Deployment Validation

**Always run validation before deploying:**

```bash
./validate-deployment.sh
```

This checks:
- ✅ Node.js version (18+)
- ✅ Azure CLI installed & logged in
- ✅ Required files present
- ✅ Project structure valid
- ✅ Build scripts available

---

## 🔐 Required Environment Variables

### For Web App (Azure Portal → Configuration → Application Settings):

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_STORAGE_ACCOUNT_NAME` | Yes | Storage account name |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `NODE_ENV` | Yes | Set to `production` |
| `WEBSITE_NODE_DEFAULT_VERSION` | Recommended | Set to `18-lts` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | Optional | Set to `true` for build on Azure |

### Using Managed Identity (Recommended):

If using Bicep template, Managed Identity is configured automatically!

Otherwise, enable manually:
```bash
# Enable managed identity
az webapp identity assign \
  --resource-group my-rg \
  --name my-webapp

# Grant storage access
az role assignment create \
  --assignee $(az webapp identity show --resource-group my-rg --name my-webapp --query principalId -o tsv) \
  --role "Storage Blob Data Contributor" \
  --scope $(az storage account show --resource-group my-rg --name mystorageaccount --query id -o tsv)
```

---

## 🎯 Recommended Deployment Flow

**For first-time deployment:**

1. **Validate environment:**
   ```bash
   ./validate-deployment.sh
   ```

2. **Deploy infrastructure with Bicep:**
   ```bash
   az group create --name prod-rg --location eastus
   az deployment group create \
     --resource-group prod-rg \
     --template-file infrastructure/main.bicep \
     --parameters infrastructure/main.parameters.json
   ```

3. **Deploy application:**
   ```bash
   ./deploy-simple.sh prod-rg asbestosguard-prod-webapp YOUR_API_KEY
   ```

4. **Set up GitHub Actions** for future deployments

**For updates:**
- Just push to main branch (if GitHub Actions is configured)
- Or run: `./deploy-simple.sh prod-rg my-webapp YOUR_API_KEY`

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
- Verify `GEMINI_API_KEY` is set
- Verify `AZURE_STORAGE_ACCOUNT_NAME` is set
- Check logs: `az webapp log tail`

### Storage errors
- Verify Managed Identity has "Storage Blob Data Contributor" role
- Or verify `AZURE_STORAGE_CONNECTION_STRING` is set correctly

---

## 📚 Additional Resources

- **Detailed guide:** [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
- **Infrastructure as Code:** [infrastructure/main.bicep](./infrastructure/main.bicep)
- **GitHub Actions:** [.github/workflows/azure-deploy.yml](.github/workflows/azure-deploy.yml)
- **Docker:** [Dockerfile](./Dockerfile)

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

- [ ] Run `./validate-deployment.sh` - all checks pass
- [ ] Azure resources created (via Bicep or manually)
- [ ] Environment variables configured
- [ ] Application deployed successfully
- [ ] Health check returns 200 OK
- [ ] Can create/read applications
- [ ] Can create/read fact sheets
- [ ] AI analysis works
- [ ] GitHub Actions configured (optional but recommended)
- [ ] Application Insights enabled (recommended)

---

**Need help?** Check the troubleshooting section or review the detailed [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) guide.
