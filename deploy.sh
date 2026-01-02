#!/bin/bash
#
# AsbestosGuard Azure Deployment Script
# ======================================
# Deploys the app to existing Azure resources only (no new resources created)
# Required values come from environment variables (set in .env.local)
#
# Required environment variables:
#   RESOURCE_GROUP   Azure resource group name (must already exist)
#   WEBAPP_NAME      Azure Web App name (must already exist)
#
# Optional environment variables:
#   AZURE_AI_FOUNDRY_PROJECT_ENDPOINT  Azure AI Foundry endpoint
#   FOUNDRY_AGENT_1_ID                 Agent 1 ID
#   FOUNDRY_AGENT_2_ID                 Agent 2 ID
#   FOUNDRY_AGENT_3_ID                 Agent 3 ID
#   FOUNDRY_AGENT_1_RESPONSES_URL      Agent 1 responses URL (for bridge)
#   FOUNDRY_AGENT_2_RESPONSES_URL      Agent 2 responses URL (for bridge)
#   FOUNDRY_AGENT_3_RESPONSES_URL      Agent 3 responses URL (for bridge)
#   SKIP_BUILD                         If set to "true", skips build
#   DEPLOY_BRIDGE                      If set to "true", deploys Python bridge service
#   ACR_NAME                           Azure Container Registry name (if deploying bridge)
#   BRIDGE_INSTANCE_NAME               Container Instance name (default: asbestosguard-bridge)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Functions
print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Simple retry helper for transient Azure CLI failures
retry_command() {
    local attempts=0
    local max_attempts=3
    local delay=5

    until "$@"; do
        attempts=$((attempts + 1))
        if [ $attempts -ge $max_attempts ]; then
            return 1
        fi
        print_info "Command failed (attempt $attempts). Retrying in $delay seconds..."
        sleep $delay
    done
}

# Load environment variables from .env.local if present
if [ -f ".env.local" ]; then
    set -a
    source .env.local 2>/dev/null || . .env.local
    set +a
    print_info "Loaded environment variables from .env.local"
fi

SKIP_BUILD=${SKIP_BUILD:-false}
DEPLOY_BRIDGE=${DEPLOY_BRIDGE:-false}
BRIDGE_INSTANCE_NAME=${BRIDGE_INSTANCE_NAME:-asbestosguard-bridge}

# Required env vars
REQUIRED_ENV_VARS=(RESOURCE_GROUP WEBAPP_NAME)
for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        print_error "Missing required environment variable: $var"
        echo "Set it in .env.local or the environment."
        exit 1
    fi
done

RESOURCE_GROUP=$RESOURCE_GROUP
WEBAPP_NAME=$WEBAPP_NAME

print_header "AsbestosGuard Azure Deployment"
print_info "Resource Group: $RESOURCE_GROUP"
print_info "Web App Name: $WEBAPP_NAME"
if [ "$SKIP_BUILD" = true ]; then
    print_info "Mode: App deploy using existing build (SKIP_BUILD=true)"
else
    print_info "Mode: App deploy with fresh build"
fi
if [ "$DEPLOY_BRIDGE" = true ]; then
    print_info "Mode: Will also deploy Python bridge service"
fi

# ============================================================
# STEP 1: Prerequisites Check
# ============================================================
print_header "Step 1: Checking Prerequisites"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm installed: $NPM_VERSION"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    print_info "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi
print_success "Azure CLI installed"

# Check Azure login
if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Please run: az login"
    exit 1
fi
AZURE_USER=$(az account show --query user.name -o tsv)
print_success "Logged in as: $AZURE_USER"

# Check required files
REQUIRED_FILES=("package.json" "server.ts" "vite.config.ts")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_success "All required files present"

# ============================================================
# STEP 2: Validate Azure Resources (no creation)
# ============================================================
print_header "Step 2: Validating Existing Azure Resources"

if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_error "Resource group does not exist: $RESOURCE_GROUP"
    exit 1
fi
print_success "Resource group found: $RESOURCE_GROUP"

if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" &> /dev/null; then
    print_error "Web App does not exist: $WEBAPP_NAME in $RESOURCE_GROUP"
    exit 1
fi
print_success "Web App found: $WEBAPP_NAME"

# ============================================================
# STEP 3: Deploy Python Bridge Service (if requested)
# ============================================================
if [ "$DEPLOY_BRIDGE" = true ]; then
    print_header "Step 3: Deploying Python Bridge Service"
    
    # Check for required bridge variables
    BRIDGE_VARS=(FOUNDRY_AGENT_1_RESPONSES_URL FOUNDRY_AGENT_2_RESPONSES_URL FOUNDRY_AGENT_3_RESPONSES_URL)
    MISSING_BRIDGE_VARS=()
    for var in "${BRIDGE_VARS[@]}"; do
        if [ -z "${!var:-}" ]; then
            MISSING_BRIDGE_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_BRIDGE_VARS[@]} -gt 0 ]; then
        print_error "Missing required bridge environment variables:"
        for var in "${MISSING_BRIDGE_VARS[@]}"; do
            echo "  - $var"
        done
        print_error "Set these in .env.local before deploying the bridge"
        exit 1
    fi
    
    # Check if ACR_NAME is set
    if [ -z "${ACR_NAME:-}" ]; then
        print_error "ACR_NAME must be set in .env.local to deploy bridge"
        exit 1
    fi
    
    # Check if ACR exists
    if ! az acr show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" &> /dev/null; then
        print_error "Azure Container Registry not found: $ACR_NAME"
        print_info "Create it with: az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic"
        exit 1
    fi
    
    # Build and push Docker image using ACR
    print_info "Building Docker image in Azure Container Registry..."
    if ! az acr build \
        --registry "$ACR_NAME" \
        --image asbestosguard-bridge:latest \
        --file Dockerfile.bridge . \
        --output none; then
        print_error "Failed to build image in ACR"
        exit 1
    fi
    print_success "Docker image built and pushed to ACR"
    
    # Tag and push to ACR
    print_info "Tagging image..."
    ACR_FQDN="${ACR_NAME}.azurecr.io"
    
    # Get ACR credentials
    ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
    
    # Create or get managed identity for the bridge service
    IDENTITY_NAME="${BRIDGE_INSTANCE_NAME}-identity"
    print_info "Setting up managed identity for authentication..."
    
    if ! az identity show --resource-group "$RESOURCE_GROUP" --name "$IDENTITY_NAME" &> /dev/null; then
        print_info "Creating managed identity: $IDENTITY_NAME"
        az identity create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$IDENTITY_NAME" \
            --output none
    else
        print_info "Using existing managed identity: $IDENTITY_NAME"
    fi
    
    # Get identity details
    IDENTITY_ID=$(az identity show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$IDENTITY_NAME" \
        --query id -o tsv)
    
    IDENTITY_PRINCIPAL_ID=$(az identity show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$IDENTITY_NAME" \
        --query principalId -o tsv)
    
    # Get subscription ID for role assignment
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    
    # Assign Cognitive Services User role to the identity
    print_info "Assigning Cognitive Services User role..."
    if ! az role assignment create \
        --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
        --role "Cognitive Services User" \
        --scope "/subscriptions/$SUBSCRIPTION_ID" \
        --output none 2>/dev/null; then
        print_info "Role assignment already exists or user lacks permissions"
    fi
    print_success "Managed identity configured"
    
    # Delete existing container if it exists
    if az container show --resource-group "$RESOURCE_GROUP" --name "$BRIDGE_INSTANCE_NAME" &> /dev/null; then
        print_info "Removing existing container instance..."
        az container delete --resource-group "$RESOURCE_GROUP" --name "$BRIDGE_INSTANCE_NAME" --yes --output none
    fi
    
    # Create Container Instance with managed identity
    print_info "Creating container instance with managed identity..."
    # Use a DNS label for public access
    DNS_LABEL="${BRIDGE_INSTANCE_NAME}-$(date +%s | tail -c 5)"
    
    if ! az container create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BRIDGE_INSTANCE_NAME" \
        --image "${ACR_FQDN}/asbestosguard-bridge:latest" \
        --registry-login-server "$ACR_FQDN" \
        --registry-username "$ACR_USERNAME" \
        --registry-password "$ACR_PASSWORD" \
        --assign-identity "$IDENTITY_ID" \
        --os-type Linux \
        --ports 8001 \
        --cpu 0.5 \
        --memory 0.5 \
        --environment-variables \
            FOUNDRY_AGENT_1_RESPONSES_URL="$FOUNDRY_AGENT_1_RESPONSES_URL" \
            FOUNDRY_AGENT_2_RESPONSES_URL="$FOUNDRY_AGENT_2_RESPONSES_URL" \
            FOUNDRY_AGENT_3_RESPONSES_URL="$FOUNDRY_AGENT_3_RESPONSES_URL" \
        --ip-address public \
        --dns-name-label "$DNS_LABEL" \
        --protocol TCP \
        --restart-policy OnFailure \
        --output none; then
        print_error "Failed to create container instance"
        exit 1
    fi
    
    print_info "Waiting for container to start..."
    sleep 5
    
    # Get container FQDN
    BRIDGE_FQDN=$(az container show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BRIDGE_INSTANCE_NAME" \
        --query ipAddress.fqdn -o tsv 2>/dev/null || true)
    
    if [ -n "$BRIDGE_FQDN" ]; then
        print_success "Bridge service deployed: http://${BRIDGE_FQDN}:8001"
        BRIDGE_SERVICE_URL="http://${BRIDGE_FQDN}:8001"
    else
        # Fallback to IP if FQDN not available
        BRIDGE_IP=$(az container show \
            --resource-group "$RESOURCE_GROUP" \
            --name "$BRIDGE_INSTANCE_NAME" \
            --query ipAddress.ip -o tsv 2>/dev/null || true)
        if [ -n "$BRIDGE_IP" ]; then
            print_success "Bridge service deployed: http://${BRIDGE_IP}:8001"
            BRIDGE_SERVICE_URL="http://${BRIDGE_IP}:8001"
        else
            print_error "Could not retrieve container IP address"
            exit 1
        fi
    fi
else
    print_header "Step 3: Skipping Bridge Service Deployment"
    print_info "Set DEPLOY_BRIDGE=true to deploy the Python bridge service"
fi

# ============================================================
# STEP 4: Build Application
# ============================================================
if [ "$SKIP_BUILD" = false ]; then
    print_header "Step 3: Building Application"
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install --silent
    print_success "Dependencies installed"
    
    # Build frontend
    print_info "Building frontend..."
    npm run build
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    print_success "Frontend built successfully"
    
    # Compile TypeScript server
    print_info "Compiling server..."
    npx tsc
    if [ ! -f "dist-server/server.js" ]; then
        print_error "Server compilation failed - dist-server/server.js not found"
        exit 1
    fi
    print_success "Server compiled successfully"
else
    print_header "Step 3: Skipping Build"
    print_info "Using existing build artifacts"
fi

# ============================================================
# STEP 4: Configure Application Settings
# ============================================================
print_header "Step 4: Configuring Application Settings"

# Set application settings
print_info "Updating application settings..."
SETTINGS="NODE_ENV=production WEBSITE_NODE_DEFAULT_VERSION=18-lts SCM_DO_BUILD_DURING_DEPLOYMENT=false"

# Add Foundry settings if available
if [ -n "${AZURE_AI_FOUNDRY_PROJECT_ENDPOINT:-}" ]; then
    SETTINGS="$SETTINGS AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=$AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"
fi
if [ -n "${FOUNDRY_AGENT_1_ID:-}" ]; then
    SETTINGS="$SETTINGS FOUNDRY_AGENT_1_ID=$FOUNDRY_AGENT_1_ID"
fi
if [ -n "${FOUNDRY_AGENT_2_ID:-}" ]; then
    SETTINGS="$SETTINGS FOUNDRY_AGENT_2_ID=$FOUNDRY_AGENT_2_ID"
fi
if [ -n "${FOUNDRY_AGENT_3_ID:-}" ]; then
    SETTINGS="$SETTINGS FOUNDRY_AGENT_3_ID=$FOUNDRY_AGENT_3_ID"
fi

# Add bridge service URL if deployed
if [ -n "${BRIDGE_SERVICE_URL:-}" ]; then
    SETTINGS="$SETTINGS AGENT_BRIDGE_SERVICE_URL=$BRIDGE_SERVICE_URL"
fi

if retry_command az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --settings $SETTINGS \
    --output none; then
    print_success "Application settings configured"
else
    print_error "Failed to configure application settings after retries"
    exit 1
fi

# Set startup command to ensure proper execution
print_info "Configuring startup command..."
if retry_command az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --startup-file "node dist-server/server.js" \
    --output none; then
    print_success "Startup command configured"
else
    print_error "Failed to configure startup command"
    exit 1
fi

# ============================================================
# STEP 5: Deploy Application
# ============================================================
print_header "Step 5: Deploying Application to Azure"

# Create deployment package
print_info "Creating deployment package..."
DEPLOY_PACKAGE="asbestosguard-deploy.zip"
rm -f "$DEPLOY_PACKAGE"

# Zip the necessary files
print_info "Including dist, dist-server, node_modules, and package files..."
zip -r "$DEPLOY_PACKAGE" \
    dist/ \
    dist-server/ \
    node_modules/ \
    package.json \
    package-lock.json \
    -x "node_modules/.cache/*" \
    > /dev/null 2>&1

if [ ! -f "$DEPLOY_PACKAGE" ]; then
    print_error "Failed to create deployment package"
    exit 1
fi
print_success "Deployment package created: $DEPLOY_PACKAGE"

print_info "Starting deployment to: $WEBAPP_NAME"
if retry_command az webapp deploy \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --src-path "$DEPLOY_PACKAGE" \
    --type zip \
    --async true; then
    print_success "Deployment initiated successfully"
    rm -f "$DEPLOY_PACKAGE"
else
    print_error "Deployment failed"
    rm -f "$DEPLOY_PACKAGE"
    exit 1
fi

# ============================================================
# STEP 6: Summary
# ============================================================
print_header "Deployment Complete!"

print_success "Application deployed to Azure"
echo ""
print_info "Web App Name: $WEBAPP_NAME"
print_info "Resource Group: $RESOURCE_GROUP"

# Get the actual default hostname from Azure
ACTUAL_HOSTNAME=$(az webapp show --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --query defaultHostName -o tsv 2>/dev/null || true)
if [ -n "$ACTUAL_HOSTNAME" ]; then
    print_info "URL: https://$ACTUAL_HOSTNAME"
    DEPLOY_URL="https://$ACTUAL_HOSTNAME"
else
    print_info "URL: https://${WEBAPP_NAME}.azurewebsites.net"
    DEPLOY_URL="https://${WEBAPP_NAME}.azurewebsites.net"
fi
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "1. Wait 2-3 minutes for deployment to complete"
echo "2. Visit: $DEPLOY_URL"
echo "3. Check health: curl $DEPLOY_URL/api/health"
echo "4. View logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME"
echo ""
print_success "Deployment script completed successfully!"
