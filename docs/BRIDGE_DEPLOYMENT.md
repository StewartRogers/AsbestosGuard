# Python Bridge Service - Azure Deployment Guide

## Overview
The Python bridge service (`agent-bridge-service.py`) runs as a separate Azure Container Instance (ACI) that the Node.js web app communicates with to invoke Azure AI Foundry agents.

## Prerequisites
- Azure CLI (`az`) installed and logged in
- Docker installed (for building the image locally) or use Azure Container Registry
- Resource group already created (same one as the web app)
- Environment variables set in `.env.local`:
  - `FOUNDRY_AGENT_1_RESPONSES_URL`
  - `FOUNDRY_AGENT_2_RESPONSES_URL`
  - `FOUNDRY_AGENT_3_RESPONSES_URL`

## Step 1: Create Azure Container Registry (ACR)

```bash
# Set variables
RESOURCE_GROUP="my-webapp-rg"
ACR_NAME="asbestosguardacr"  # Must be lowercase, 5-50 chars
LOCATION="eastus2"

# Create container registry
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic
```

## Step 2: Build and Push Docker Image

```bash
# Build the image
docker build -f Dockerfile.bridge -t asbestosguard-bridge:latest .

# Tag for ACR
docker tag asbestosguard-bridge:latest "${ACR_NAME}.azurecr.io/asbestosguard-bridge:latest"

# Login to ACR
az acr login --name "$ACR_NAME"

# Push to ACR
docker push "${ACR_NAME}.azurecr.io/asbestosguard-bridge:latest"
```

## Step 3: Create Container Instance

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# Create Container Instance with environment variables from .env.local
az container create \
  --resource-group "$RESOURCE_GROUP" \
  --name "asbestosguard-bridge" \
  --image "${ACR_NAME}.azurecr.io/asbestosguard-bridge:latest" \
  --registry-login-server "${ACR_NAME}.azurecr.io" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --ports 8001 \
  --cpu 0.5 \
  --memory 0.5 \
  --environment-variables \
    FOUNDRY_AGENT_1_RESPONSES_URL="$FOUNDRY_AGENT_1_RESPONSES_URL" \
    FOUNDRY_AGENT_2_RESPONSES_URL="$FOUNDRY_AGENT_2_RESPONSES_URL" \
    FOUNDRY_AGENT_3_RESPONSES_URL="$FOUNDRY_AGENT_3_RESPONSES_URL" \
  --ip-address public \
  --protocol TCP \
  --restart-policy OnFailure
```

## Step 4: Get the Container Instance IP

```bash
BRIDGE_IP=$(az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name "asbestosguard-bridge" \
  --query ipAddress.ip -o tsv)

echo "Bridge service running at: http://${BRIDGE_IP}:8001"
echo "Health check: curl http://${BRIDGE_IP}:8001/health"
```

## Step 5: Update Web App with Bridge Service URL

```bash
WEBAPP_NAME="AsbestosGuard"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings "BRIDGE_SERVICE_URL=http://${BRIDGE_IP}:8001"
```

## Step 6: Verify Connection

Test that the Node.js web app can reach the bridge:
```bash
curl "http://${BRIDGE_IP}:8001/health"
```

Should return:
```json
{
  "status": "healthy",
  "agents": ["EMPFACTSHEET", "APPRISKANALYSIS", "EMPWEBPROFILEAGENT"]
}
```

## Troubleshooting

### Container won't start
```bash
# Check logs
az container logs \
  --resource-group "$RESOURCE_GROUP" \
  --name "asbestosguard-bridge"
```

### Can't reach container
- Verify container is running: `az container show --resource-group "$RESOURCE_GROUP" --name "asbestosguard-bridge" --query instanceView.state`
- Check public IP is assigned: `az container show --resource-group "$RESOURCE_GROUP" --name "asbestosguard-bridge" --query ipAddress`
- Ensure port 8001 is exposed

### Agent invocation fails
- Verify environment variables are set: `az container show --resource-group "$RESOURCE_GROUP" --name "asbestosguard-bridge" --query "containers[0].environmentVariables"`
- Check bridge logs for agent URL errors

## Optional: Automate with Enhanced deploy.sh

The deploy script can be enhanced to automate bridge service deployment. See the updated deploy.sh with `--deploy-bridge` flag.

## Cleanup

To remove the bridge service:
```bash
az container delete --resource-group "$RESOURCE_GROUP" --name "asbestosguard-bridge" --yes
```

To remove the registry:
```bash
az acr delete --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --yes
```
