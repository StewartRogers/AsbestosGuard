# Azure Deployment Guide for AsbestosGuard

This guide provides step-by-step instructions for deploying the AsbestosGuard application to Azure using Azure App Service (Web App) and Azure Blob Storage.

## Prerequisites

- Azure subscription
- Azure CLI installed (optional, for command-line deployment)
- Node.js 18+ installed locally
- Git installed locally

## Architecture Overview

The application is deployed as:
- **Frontend + Backend**: Azure App Service (Web App) - serves both the React frontend and Express API
- **Data Storage**: Azure Blob Storage - stores applications, fact sheets, analysis results, and policy documents
- **Authentication**: Uses Azure Managed Identity for secure access to Blob Storage (recommended for production)

## Part 1: Azure Resource Setup

You've already created:
1. ✅ Resource Group
2. ✅ Azure Web App (App Service)
3. ✅ Azure Storage Account

### 1.1 Configure Storage Account

1. **Get Storage Connection String**:
   - Go to your Storage Account in Azure Portal
   - Navigate to **Security + networking** → **Access keys**
   - Copy the **Connection string** from key1 or key2
   - Save this securely - you'll need it later

2. **Enable CORS (if needed for direct frontend access)**:
   - Go to **Resource sharing (CORS)** under Settings
   - Add allowed origins (your Web App URL)
   - Allowed methods: GET, POST, PUT, DELETE
   - Allowed headers: *
   - Exposed headers: *
   - Max age: 3600

3. **Create Blob Containers** (Optional - the app will create them automatically):
   - Go to **Containers** under Data storage
   - Create the following containers (all set to Private access):
     - `applications`
     - `fact-sheets`
     - `analysis`
     - `policies`
     - `data`

### 1.2 Configure Web App

1. **Enable Managed Identity** (Recommended for Production):
   - Go to your Web App in Azure Portal
   - Navigate to **Settings** → **Identity**
   - Under **System assigned**, turn Status to **On**
   - Click **Save** and note the Object (principal) ID

2. **Grant Storage Access to Managed Identity**:
   - Go back to your Storage Account
   - Navigate to **Access Control (IAM)**
   - Click **+ Add** → **Add role assignment**
   - Select role: **Storage Blob Data Contributor**
   - Assign access to: **Managed Identity**
   - Select your Web App's managed identity
   - Click **Review + assign**

3. **Configure Application Settings** (Environment Variables):
   - Go to your Web App
   - Navigate to **Settings** → **Configuration**
   - Under **Application settings**, add the following:

   **Required Settings:**
   ```
   AZURE_STORAGE_ACCOUNT_NAME = your_storage_account_name
   GEMINI_API_KEY = your_gemini_api_key_here
   NODE_ENV = production
   ```

   **Alternative to Managed Identity** (if not using it):
   ```
   AZURE_STORAGE_CONNECTION_STRING = your_connection_string_from_step_1.1
   ```

   **Optional Settings:**
   ```
   WEBSITE_NODE_DEFAULT_VERSION = 18-lts
   SCM_DO_BUILD_DURING_DEPLOYMENT = true
   ```

   - Click **Save** at the top

## Part 2: Prepare Application for Deployment

### 2.1 Local Environment Setup

1. **Update your local `.env.local` file** for testing Azure Storage locally (optional):
   ```bash
   # Copy from template
   cp .env.azure.template .env.local
   
   # Edit .env.local with your values
   AZURE_STORAGE_CONNECTION_STRING=your_connection_string
   GEMINI_API_KEY=your_api_key
   USE_AZURE_STORAGE=true
   ```

2. **Test locally with Azure Storage** (optional):
   ```bash
   npm install
   npm run build
   npm run server
   ```
   Visit http://localhost:5000 and verify the app can connect to Azure Storage.

### 2.2 Prepare for Deployment

1. **Ensure all dependencies are installed**:
   ```bash
   npm install
   ```

2. **Build the frontend**:
   ```bash
   npm run build
   ```
   This creates optimized production files in the `dist/` folder.

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Prepare for Azure deployment"
   ```

## Part 3: Deploy to Azure

### Option A: Deploy via Visual Studio Code (Recommended)

1. **Install Azure App Service extension**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Azure App Service"
   - Install it

2. **Deploy**:
   - Click the Azure icon in the sidebar
   - Sign in to Azure
   - Right-click your Web App under App Service
   - Select **Deploy to Web App**
   - Choose your workspace folder
   - Confirm deployment

3. **Monitor deployment**:
   - Output window shows deployment progress
   - Wait for "Deployment successful" message

### Option B: Deploy via Azure CLI

1. **Login to Azure**:
   ```bash
   az login
   ```

2. **Set your subscription** (if you have multiple):
   ```bash
   az account set --subscription "your-subscription-name"
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Deploy using Azure CLI**:
   ```bash
   az webapp up --name your-web-app-name --resource-group your-resource-group-name --runtime "NODE:18-lts"
   ```

### Option C: Deploy via GitHub Actions (CI/CD)

1. **Get publish profile**:
   - Go to your Web App in Azure Portal
   - Click **Get publish profile** at the top
   - Save the downloaded file

2. **Add to GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: paste the entire content of the publish profile file

3. **Create workflow file** `.github/workflows/azure-deploy.yml`:
   ```yaml
   name: Deploy to Azure Web App

   on:
     push:
       branches:
         - main
     workflow_dispatch:

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
       
       - name: Set up Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '18'
           
       - name: Install dependencies
         run: npm ci
         
       - name: Build application
         run: npm run build
         
       - name: Deploy to Azure Web App
         uses: azure/webapps-deploy@v2
         with:
           app-name: 'your-web-app-name'
           publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
           package: .
   ```

4. **Push to GitHub**:
   ```bash
   git add .github/workflows/azure-deploy.yml
   git commit -m "Add Azure deployment workflow"
   git push
   ```

### Option D: Deploy via Local Git

1. **Configure deployment credentials**:
   - Go to your Web App in Azure Portal
   - Navigate to **Deployment** → **Deployment Center**
   - Source: **Local Git**
   - Save and note the Git Clone URI

2. **Add Azure as remote**:
   ```bash
   git remote add azure <your-git-clone-uri>
   ```

3. **Push to Azure**:
   ```bash
   git push azure main
   ```

## Part 4: Post-Deployment Configuration

### 4.1 Verify Deployment

1. **Check Web App URL**:
   - Go to your Web App in Azure Portal
   - Click the URL at the top (e.g., `https://your-app-name.azurewebsites.net`)
   - The application should load

2. **Check Application Logs**:
   - Go to **Monitoring** → **Log stream**
   - Look for:
     - "✓ Azure Blob Storage initialized..."
     - "Server is running on port 8080" (or similar)
     - No error messages

3. **Test Storage Connection**:
   - Try creating a new fact sheet or application
   - Verify it saves successfully
   - Check your Storage Account → Containers to see the data

### 4.2 Troubleshooting

**Issue: App doesn't start**
- Check **Application settings** are configured correctly
- Verify `AZURE_STORAGE_ACCOUNT_NAME` or `AZURE_STORAGE_CONNECTION_STRING` is set
- Check **Log stream** for error messages

**Issue: Cannot connect to storage**
- Verify Managed Identity is enabled and has the correct permissions
- Or verify the connection string is correct
- Check storage account firewall settings (allow Azure services)

**Issue: 500 errors**
- Check **Log stream** for detailed error messages
- Verify `GEMINI_API_KEY` is set if using AI features
- Check application logs in Storage Account if logging is configured

**Issue: Build fails during deployment**
- Ensure `package.json` has all required dependencies
- Set `SCM_DO_BUILD_DURING_DEPLOYMENT=true` in Application Settings
- Check Node.js version: `WEBSITE_NODE_DEFAULT_VERSION=18-lts`

### 4.3 Enable Custom Domain (Optional)

1. Go to **Settings** → **Custom domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. Add SSL certificate (free App Service Managed Certificate available)

### 4.4 Configure HTTPS Only

1. Go to **Settings** → **Configuration**
2. Under **General settings**
3. Set **HTTPS Only** to **On**
4. Click **Save**

## Part 5: Development Workflow

### Local Development
```bash
# Use local file storage
npm run start
```

### Test with Azure Storage Locally
```bash
# Configure .env.local with Azure credentials
USE_AZURE_STORAGE=true
AZURE_STORAGE_CONNECTION_STRING=your_connection_string

# Run server
npm run server
```

### Deploy Updates
```bash
# Build and deploy
npm run build
# Then use one of the deployment methods from Part 3
```

## Part 6: Monitoring and Maintenance

### Enable Application Insights (Recommended)

1. Go to your Web App
2. Navigate to **Application Insights**
3. Click **Turn on Application Insights**
4. Create new or select existing resource
5. Enable for Node.js
6. Click **Apply**

This provides:
- Performance monitoring
- Error tracking
- Usage analytics
- Custom telemetry

### Set Up Alerts

1. Go to **Monitoring** → **Alerts**
2. Create alert rules for:
   - High response time
   - HTTP 5xx errors
   - High memory usage
   - Storage account errors

### Backup Strategy

1. **Storage Account**:
   - Enable soft delete for blobs
   - Set up backup/replication if needed
   - Consider lifecycle management for old data

2. **Web App**:
   - Code is in Git repository (already backed up)
   - Application settings can be exported

## Part 7: Security Best Practices

1. **Use Managed Identity** instead of connection strings
2. **Enable HTTPS Only**
3. **Set up Azure Key Vault** for secrets (advanced)
4. **Configure firewall rules** on Storage Account
5. **Enable diagnostic logging**
6. **Regularly update dependencies**:
   ```bash
   npm audit
   npm update
   ```

## Cost Optimization

1. **Choose appropriate App Service Plan**:
   - Basic (B1): ~$13/month - good for development
   - Standard (S1): ~$70/month - good for production
   - Premium: for high-traffic production

2. **Storage costs**:
   - Blob storage: ~$0.02/GB/month
   - Transactions: minimal cost for typical usage

3. **Monitor usage**:
   - Azure Cost Management
   - Set up budget alerts

## Support and Resources

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Node.js on Azure Documentation](https://docs.microsoft.com/en-us/azure/developer/javascript/)

## Quick Reference Commands

```bash
# Build the application
npm run build

# Start in production mode locally
npm run start:prod

# Deploy via Azure CLI
az webapp up --name <your-app-name> --resource-group <your-rg>

# View logs
az webapp log tail --name <your-app-name> --resource-group <your-rg>

# Restart web app
az webapp restart --name <your-app-name> --resource-group <your-rg>

# List application settings
az webapp config appsettings list --name <your-app-name> --resource-group <your-rg>

# Set an application setting
az webapp config appsettings set --name <your-app-name> --resource-group <your-rg> --settings KEY=VALUE
```

---

## Summary Checklist

- [ ] Storage Account created with access keys
- [ ] Web App created
- [ ] Managed Identity enabled on Web App
- [ ] Managed Identity granted Storage Blob Data Contributor role
- [ ] Application settings configured in Web App
- [ ] Application built locally (`npm run build`)
- [ ] Application deployed to Azure
- [ ] Verified deployment is working
- [ ] Tested creating/reading data
- [ ] HTTPS Only enabled
- [ ] Application Insights enabled (optional)
- [ ] Alerts configured (optional)

**Your application should now be running at:** `https://your-app-name.azurewebsites.net`
