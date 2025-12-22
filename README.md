<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally and deploy it to Azure.

View your app in AI Studio: https://ai.studio/apps/drive/1rhmD28GfetTDptSh0RcLfZDdCQeu-MB5

## Run Locally

**Prerequisites:**  Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure the Gemini API key (two options):

   - Preferred (secure): run a small server-side proxy or server function that holds your API key and forwards requests from the frontend. This keeps the key secret and is recommended for production.

   - For local development: create a `.env.local` file at the project root and add the following line. Keep the key server-side and do NOT commit it:

     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. Run the app:
   ```bash
   npm run start
   ```

## Deploy to Azure

Multiple deployment options are available:

### 🚀 Quick Deploy (Recommended)

1. **Validate your environment:**
   ```bash
   ./validate-deployment.sh
   ```

2. **Deploy infrastructure + application:**
   ```bash
   # Create resources with Bicep
   az deployment group create \
     --resource-group my-rg \
     --template-file infrastructure/main.bicep \
     --parameters appName=asbestosguard geminiApiKey=$API_KEY
   
   # Deploy application
   ./deploy-simple.sh my-rg my-webapp-name $API_KEY
   ```

### 📚 Full Documentation

- **[Quick Deployment Guide](./DEPLOY.md)** - All deployment options
- **[Deployment Improvements Summary](./DEPLOYMENT_IMPROVEMENTS.md)** - What's new and improved
- **[Detailed Azure Guide](./AZURE_DEPLOYMENT.md)** - Step-by-step manual setup
- **[Infrastructure Guide](./infrastructure/README.md)** - Bicep templates and IaC

### Other Deployment Options

- **GitHub Actions:** Automated CI/CD on push to main (see [.github/workflows/azure-deploy.yml](./.github/workflows/azure-deploy.yml))
- **Docker:** Containerized deployment (see [Dockerfile](./Dockerfile))
- **PowerShell:** Windows deployment script (see [deploy-to-azure.ps1](./deploy-to-azure.ps1))
