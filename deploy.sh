#!/bin/bash
#
# AsbestosGuard Azure Deployment Script
# ======================================
# Single unified script for deploying AsbestosGuard to Azure
# Handles both initial deployment and refresh deployments
#
# Usage:
#   ./deploy.sh <resource-group> <webapp-name> [options]
#
# Options:
#   --skip-infrastructure    Skip Bicep infrastructure deployment
#   --skip-build            Skip building the application
#   --app-name <name>       Application name for Bicep (default: asbestosguard)
#   --environment <env>     Environment (dev|staging|prod, default: prod)
#   --location <location>   Azure location (default: eastus)
#
# Environment Variables (can be set in .env.local):
#   AZURE_AI_FOUNDRY_PROJECT_ENDPOINT  Azure AI Foundry endpoint
#   FOUNDRY_AGENT_1_ID                 Agent 1 ID
#   FOUNDRY_AGENT_2_ID                 Agent 2 ID
#   FOUNDRY_AGENT_3_ID                 Agent 3 ID
#
# Examples:
#   # Full deployment (infrastructure + app)
#   ./deploy.sh my-rg my-webapp
#
#   # Refresh deployment (app only, skip infrastructure)
#   ./deploy.sh my-rg my-webapp --skip-infrastructure
#
#   # Custom environment
#   ./deploy.sh my-rg my-webapp --environment staging --location westus

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

show_usage() {
    cat << EOF
Usage: $0 <resource-group> <webapp-name> [options]

Arguments:
  resource-group    Azure resource group name
  webapp-name       Azure web app name

Options:
  --skip-infrastructure    Skip Bicep infrastructure deployment (use for refresh)
  --skip-build            Skip building the application
  --app-name <name>       Application name for Bicep (default: asbestosguard)
  --environment <env>     Environment (dev|staging|prod, default: prod)
  --location <location>   Azure location (default: eastus)
  --help                  Show this help message

Examples:
  # Full deployment (first time)
  $0 my-rg my-webapp

  # Refresh deployment (update app only)
  $0 my-rg my-webapp --skip-infrastructure

  # Custom environment
  $0 my-rg my-webapp --environment staging --location westus

Environment Variables (optional, can be set in .env.local):
  AZURE_AI_FOUNDRY_PROJECT_ENDPOINT  Azure AI Foundry endpoint
  FOUNDRY_AGENT_1_ID                 Agent 1 ID
  FOUNDRY_AGENT_2_ID                 Agent 2 ID
  FOUNDRY_AGENT_3_ID                 Agent 3 ID

EOF
}

# Load environment variables from .env.local if present
if [ -f ".env.local" ]; then
    set -a
    source .env.local 2>/dev/null || . .env.local
    set +a
    print_info "Loaded environment variables from .env.local"
fi

# Parse arguments
SKIP_INFRASTRUCTURE=false
SKIP_BUILD=false
APP_NAME="asbestosguard"
ENVIRONMENT="prod"
LOCATION="eastus"

if [ "$#" -lt 2 ]; then
    if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
        show_usage
        exit 0
    fi
    print_error "Missing required arguments"
    echo ""
    show_usage
    exit 1
fi

RESOURCE_GROUP=$1
WEBAPP_NAME=$2
shift 2

# Parse optional arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        --skip-infrastructure)
            SKIP_INFRASTRUCTURE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --app-name)
            if [ -z "$2" ] || [[ "$2" == --* ]]; then
                print_error "--app-name requires a value"
                exit 1
            fi
            APP_NAME="$2"
            shift 2
            ;;
        --environment)
            if [ -z "$2" ] || [[ "$2" == --* ]]; then
                print_error "--environment requires a value (dev|staging|prod)"
                exit 1
            fi
            ENVIRONMENT="$2"
            shift 2
            ;;
        --location)
            if [ -z "$2" ] || [[ "$2" == --* ]]; then
                print_error "--location requires a value (e.g., eastus, westus2)"
                exit 1
            fi
            LOCATION="$2"
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment value
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT (must be dev, staging, or prod)"
    exit 1
fi

print_header "AsbestosGuard Azure Deployment"
print_info "Resource Group: $RESOURCE_GROUP"
print_info "Web App Name: $WEBAPP_NAME"
print_info "App Name: $APP_NAME"
print_info "Environment: $ENVIRONMENT"
print_info "Location: $LOCATION"
if [ "$SKIP_INFRASTRUCTURE" = true ]; then
    print_info "Mode: Refresh (skipping infrastructure)"
else
    print_info "Mode: Full deployment (infrastructure + app)"
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
REQUIRED_FILES=("package.json" "server.ts" "vite.config.ts" "infrastructure/main.bicep")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_success "All required files present"

# ============================================================
# STEP 2: Deploy Infrastructure (if not skipped)
# ============================================================
if [ "$SKIP_INFRASTRUCTURE" = false ]; then
    print_header "Step 2: Deploying Azure Infrastructure"
    
    # Check if resource group exists, create if not
    if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_info "Creating resource group: $RESOURCE_GROUP"
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
        print_success "Resource group created"
    else
        print_info "Using existing resource group: $RESOURCE_GROUP"
    fi
    
    # Prepare Bicep parameters
    BICEP_PARAMS="appName=$APP_NAME environment=$ENVIRONMENT location=$LOCATION"
    
    # Add Foundry parameters if available
    if [ -n "${AZURE_AI_FOUNDRY_PROJECT_ENDPOINT:-}" ]; then
        BICEP_PARAMS="$BICEP_PARAMS foundryEndpoint=$AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"
        print_info "Including Azure AI Foundry configuration"
    else
        BICEP_PARAMS="$BICEP_PARAMS foundryEndpoint=https://placeholder.ai.azure.com"
        print_info "No Foundry endpoint found, using placeholder (update in Azure Portal if needed)"
    fi
    
    if [ -n "${FOUNDRY_AGENT_1_ID:-}" ]; then
        BICEP_PARAMS="$BICEP_PARAMS foundryAgent1Id=$FOUNDRY_AGENT_1_ID"
    fi
    if [ -n "${FOUNDRY_AGENT_2_ID:-}" ]; then
        BICEP_PARAMS="$BICEP_PARAMS foundryAgent2Id=$FOUNDRY_AGENT_2_ID"
    fi
    if [ -n "${FOUNDRY_AGENT_3_ID:-}" ]; then
        BICEP_PARAMS="$BICEP_PARAMS foundryAgent3Id=$FOUNDRY_AGENT_3_ID"
    fi
    
    # Deploy infrastructure
    print_info "Deploying Bicep template..."
    DEPLOYMENT_OUTPUT=$(az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file infrastructure/main.bicep \
        --parameters $BICEP_PARAMS \
        --query 'properties.outputs' \
        -o json 2>&1)
    
    if [ $? -eq 0 ]; then
        print_success "Infrastructure deployed successfully"
        
        # Extract outputs if available
        WEBAPP_NAME_FROM_OUTPUT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.webAppName.value // empty' 2>/dev/null || true)
        if [ -n "$WEBAPP_NAME_FROM_OUTPUT" ]; then
            WEBAPP_NAME="$WEBAPP_NAME_FROM_OUTPUT"
            print_info "Web App Name from deployment: $WEBAPP_NAME"
        fi
        
        WEBAPP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.webAppUrl.value // empty' 2>/dev/null || true)
        if [ -n "$WEBAPP_URL" ]; then
            print_info "Web App URL: $WEBAPP_URL"
        fi
    else
        print_error "Infrastructure deployment failed"
        echo "$DEPLOYMENT_OUTPUT"
        exit 1
    fi
    
    # Wait a moment for resources to be ready
    print_info "Waiting for resources to be ready..."
    sleep 10
else
    print_header "Step 2: Skipping Infrastructure Deployment"
    print_info "Using existing Azure resources"
fi

# ============================================================
# STEP 3: Build Application
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
    npx tsc server.ts --module ESNext --target ES2020 --moduleResolution=node --esModuleInterop --skipLibCheck
    if [ ! -f "server.js" ]; then
        print_error "Server compilation failed - server.js not found"
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
SETTINGS="NODE_ENV=production WEBSITE_NODE_DEFAULT_VERSION=18-lts SCM_DO_BUILD_DURING_DEPLOYMENT=true"

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

az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --settings $SETTINGS \
    --output none

if [ $? -eq 0 ]; then
    print_success "Application settings configured"
else
    print_error "Failed to configure application settings"
    exit 1
fi

# ============================================================
# STEP 5: Deploy Application
# ============================================================
print_header "Step 5: Deploying Application to Azure"

print_info "Starting deployment to: $WEBAPP_NAME"
az webapp deploy \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --src-path . \
    --type zip \
    --async true

if [ $? -eq 0 ]; then
    print_success "Deployment initiated successfully"
else
    print_error "Deployment failed"
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
print_info "URL: https://${WEBAPP_NAME}.azurewebsites.net"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "1. Wait 2-3 minutes for deployment to complete"
echo "2. Visit: https://${WEBAPP_NAME}.azurewebsites.net"
echo "3. Check health: curl https://${WEBAPP_NAME}.azurewebsites.net/api/health"
echo "4. View logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME"
echo ""
print_success "Deployment script completed successfully!"
