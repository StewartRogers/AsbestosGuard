## Run Locally

**Prerequisites:**  Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Azure AI Foundry:

   - Create a `.env.local` file at the project root and add the following configuration:

     ```
     # Azure AI Foundry Configuration
     AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
     FOUNDRY_AGENT_1_ID=asst_your_agent_1_id
     FOUNDRY_AGENT_2_ID=asst_your_agent_2_id
     FOUNDRY_AGENT_3_ID=asst_your_agent_3_id
     ```

   - Authenticate with Azure CLI:
     ```bash
     az login
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
     --parameters appName=asbestosguard
   
   # Deploy application
   ./deploy-simple.sh my-rg my-webapp-name
   ```

### 📚 Full Documentation

- **[Quick Deployment Guide](./DEPLOY.md)** - All deployment options
- **[Deployment Improvements Summary](./DEPLOYMENT_IMPROVEMENTS.md)** - What's new and improved
- **[Detailed Azure Guide](./AZURE_DEPLOYMENT.md)** - Step-by-step manual setup
- **[Infrastructure Guide](./infrastructure/README.md)** - Bicep templates and IaC
- **[Azure AI Foundry Integration](./FOUNDRY_INTEGRATION_READY.md)** - AI agent setup and usage

### Other Deployment Options

- **GitHub Actions:** Automated CI/CD on push to main (see [.github/workflows/azure-deploy.yml](./.github/workflows/azure-deploy.yml))
- **Docker:** Containerized deployment (see [Dockerfile](./Dockerfile))
- **PowerShell:** Windows deployment script (see [deploy-to-azure.ps1](./deploy-to-azure.ps1))
