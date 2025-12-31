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

AsbestosGuard uses a **single unified deployment script** for simplified Azure deployment.

### 🚀 Quick Deploy

**First-time deployment (creates infrastructure + deploys app):**
```bash
./deploy.sh <resource-group> <webapp-name>
```

**Refresh deployment (updates app only):**
```bash
./deploy.sh <resource-group> <webapp-name> --skip-infrastructure
```

**Example:**
```bash
# First time - creates everything
./deploy.sh asbestosguard-rg asbestosguard-prod-webapp

# Subsequent updates - just refresh the app
./deploy.sh asbestosguard-rg asbestosguard-prod-webapp --skip-infrastructure
```

### 📝 Configuration

**Optional:** Create `.env.local` for Azure AI Foundry configuration:
```bash
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
FOUNDRY_AGENT_1_ID=asst_your_agent_1_id
FOUNDRY_AGENT_2_ID=asst_your_agent_2_id
FOUNDRY_AGENT_3_ID=asst_your_agent_3_id
```

The deployment script will automatically use these settings if present.

### 📚 Additional Documentation

- **[Quick Deployment Guide](./DEPLOY.md)** - Additional deployment options and details
- **[Detailed Azure Guide](./AZURE_DEPLOYMENT.md)** - Step-by-step manual setup reference
- **[Azure AI Foundry Integration](./FOUNDRY_INTEGRATION_READY.md)** - AI agent setup and usage

### Alternative Deployment Options

- **GitHub Actions:** Automated CI/CD on push to main (see [.github/workflows/azure-deploy.yml](./.github/workflows/azure-deploy.yml))
- **Docker:** Containerized deployment (see [Dockerfile](./Dockerfile))
