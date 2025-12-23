#!/usr/bin/env bash
set -euo pipefail

# deploy-all.sh
# Combined deployment script: validate, deploy Bicep, build, and deploy application
# Usage: ./deploy-all.sh <resource-group> [app-name] [environment] [location] [sku] [gemini-api-key]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error()   { echo -e "${RED}✗ $1${NC}"; }
print_info()    { echo -e "${YELLOW}→ $1${NC}"; }

if [ "$#" -lt 1 ]; then
  print_error "Usage: $0 <resource-group> [app-name] [environment] [location] [sku] [gemini-api-key]"
  exit 1
fi

RESOURCE_GROUP=$1
APP_NAME=${2:-}
ENVIRONMENT=${3:-dev}
LOCATION=${4:-}
SKU=${5:-B1}
GEMINI_API_KEY=${6:-}

# Helper: try jq first, fallback to sed
read_default_from_params() {
  key=$1
  file="infrastructure/main.parameters.json"
  if [ ! -f "$file" ]; then
    return 1
  fi
  if command -v jq &> /dev/null; then
    jq -r ".parameters[\"${key}\"].value // empty" "$file" 2> /dev/null || true
  else
    sed -n "/\"${key}\"/,+2p" "$file" | sed -n 's/.*"value"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1 || true
  fi
}

print_header "Validating environment and prerequisites"

if ! command -v az &> /dev/null; then
  print_error "Azure CLI (az) is required"
  exit 1
fi
if ! az account show &> /dev/null; then
  print_error "Not logged in to Azure. Run: az login"
  exit 1
fi
print_success "Azure CLI available and logged in"

if ! command -v node &> /dev/null; then
  print_error "Node.js is required"
  exit 1
fi
print_success "Node.js available: $(node --version)"

if ! command -v npm &> /dev/null; then
  print_error "npm is required"
  exit 1
fi
print_success "npm available: $(npm --version)"

print_info "Running project validation script"
./validate-deployment.sh
print_success "Validation script passed"

# Load .env.local if present (export variables)
if [ -f ".env.local" ]; then
  set -a
  . .env.local
  set +a
  print_info "Loaded environment variables from .env.local"
fi

# Fill defaults from parameters file if missing
if [ -z "$APP_NAME" ]; then
  APP_NAME=$(read_default_from_params appName || true)
  APP_NAME=${APP_NAME:-asbestosguard}
  print_info "Using app name: $APP_NAME"
fi

if [ -z "$GEMINI_API_KEY" ]; then
  # Prefer environment variable
  if [ -n "${GEMINI_API_KEY:-}" ]; then
    GEMINI_API_KEY=${GEMINI_API_KEY}
  fi
fi

# If gemini key still empty, check environment or prompt securely
GEMINI_API_KEY=${GEMINI_API_KEY:-}
if [ -z "$GEMINI_API_KEY" ]; then
  echo -n "Enter GEMINI API key (input hidden): "
  read -rs GEMINI_API_KEY
  echo
fi

if [ -z "$LOCATION" ]; then
  # try to get resource group location; if it fails, leave blank and let Bicep use resourceGroup().location
  if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
    print_info "Resource group location: $LOCATION"
  fi
fi

print_header "Deploying infrastructure (Bicep)"

DEPLOY_CMD=(az deployment group create --resource-group "$RESOURCE_GROUP" --template-file infrastructure/main.bicep)
DEPLOY_CMD+=(--parameters appName="$APP_NAME" geminiApiKey="$GEMINI_API_KEY" environment="$ENVIRONMENT" appServicePlanSku="$SKU")
if [ -n "$LOCATION" ]; then
  DEPLOY_CMD+=(--parameters location="$LOCATION")
fi

print_info "Running Bicep deployment..."
"${DEPLOY_CMD[@]}"

DEPLOY_OUTPUT=$("${DEPLOY_CMD[@]}" -o json)
print_success "Bicep deployment initiated"

# Extract outputs
WEBAPP_NAME=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.webAppName.value' 2>/dev/null || az deployment group show --name $(echo "$DEPLOY_OUTPUT" | jq -r '.name' 2>/dev/null) --resource-group "$RESOURCE_GROUP" --query properties.outputs.webAppName.value -o tsv 2>/dev/null || true)
WEBAPP_URL=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.webAppUrl.value' 2>/dev/null || az deployment group show --name $(echo "$DEPLOY_OUTPUT" | jq -r '.name' 2>/dev/null) --resource-group "$RESOURCE_GROUP" --query properties.outputs.webAppUrl.value -o tsv 2>/dev/null || true)

if [ -z "$WEBAPP_NAME" ]; then
  # Fallback: compute web app name same way Bicep does
  WEBAPP_NAME="${APP_NAME}-${ENVIRONMENT}-webapp"
  print_info "Using fallback web app name: $WEBAPP_NAME"
fi

print_header "Building application"
npm install
npm run build
print_success "Frontend built"

print_info "Compiling server.ts"
npx tsc server.ts --module ESNext --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck || true
if [ -f server.js ]; then
  print_success "Server compiled"
else
  print_info "server.js not found; continuing if backend isn't required"
fi

print_header "Configuring app settings and deploying application"

print_info "Setting app settings (GEMINI key will be stored in app settings)"
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings GEMINI_API_KEY="$GEMINI_API_KEY" NODE_ENV=production WEBSITE_NODE_DEFAULT_VERSION=18-lts SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  --output none

print_success "App settings configured"

print_info "Starting ZIP deployment (async)"
az webapp deploy --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --src-path . --type zip --async true

print_success "Deployment initiated"

if [ -n "$WEBAPP_URL" ]; then
  print_success "App should be available at: $WEBAPP_URL"
else
  print_info "Try: https://${WEBAPP_NAME}.azurewebsites.net"
fi

echo ""
echo "To tail logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME"
echo "To view app settings: az webapp config appsettings list --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME"

print_header "Done"
