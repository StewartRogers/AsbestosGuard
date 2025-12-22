#!/bin/bash

# Simple one-command Azure deployment script for AsbestosGuard
# Usage: ./deploy-simple.sh <resource-group> <app-name> <gemini-api-key>

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Check arguments
if [ "$#" -ne 3 ]; then
    print_error "Usage: $0 <resource-group> <app-name> <gemini-api-key>"
    echo "Example: $0 my-resource-group asbestosguard-webapp YOUR_API_KEY"
    exit 1
fi

RESOURCE_GROUP=$1
WEBAPP_NAME=$2
GEMINI_API_KEY=$3

# Check prerequisites
print_header "Checking Prerequisites"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js installed: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm installed: $(npm --version)"

if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    exit 1
fi
print_success "Azure CLI installed"

# Check Azure login
if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Please run 'az login'"
    exit 1
fi
print_success "Logged in as: $(az account show --query user.name -o tsv)"

# Install dependencies
print_header "Installing Dependencies"
npm install
print_success "Dependencies installed"

# Build application
print_header "Building Application"
npm run build
print_success "Frontend built successfully"

# Check if dist exists
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

# Compile TypeScript server
print_info "Compiling server..."
npx tsc server.ts --module ESNext --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck
if [ ! -f "server.js" ]; then
    print_error "Server compilation failed"
    exit 1
fi
print_success "Server compiled successfully"

# Deploy to Azure
print_header "Deploying to Azure"
print_info "Web App: $WEBAPP_NAME"
print_info "Resource Group: $RESOURCE_GROUP"

# Set required app settings
print_info "Configuring application settings..."
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --settings \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    NODE_ENV=production \
    WEBSITE_NODE_DEFAULT_VERSION=18-lts \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    --output none

if [ $? -eq 0 ]; then
    print_success "Application settings configured"
else
    print_error "Failed to configure application settings"
    exit 1
fi

# Deploy using ZIP deploy
print_info "Deploying application..."
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

# Summary
print_header "Deployment Complete"
print_success "Application deployed to Azure!"
print_info "Web App URL: https://${WEBAPP_NAME}.azurewebsites.net"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "1. Wait a few minutes for deployment to complete"
echo "2. Visit: https://${WEBAPP_NAME}.azurewebsites.net"
echo "3. Check logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME"
echo ""
