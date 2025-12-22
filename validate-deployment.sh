#!/bin/bash

# Pre-deployment validation script
# Checks that all requirements are met before deploying to Azure

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

print_check() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        ERRORS=$((ERRORS + 1))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

echo "========================================="
echo "AsbestosGuard Deployment Validation"
echo "========================================="
echo ""

# Check Node.js
echo "Checking prerequisites..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_check "Node.js installed: $NODE_VERSION" 0
    
    # Check if version is 18 or higher
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        print_check "Node.js version >= 18" 0
    else
        print_check "Node.js version >= 18" 1
        echo "   Current: $NODE_VERSION, Required: v18+"
    fi
else
    print_check "Node.js installed" 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_check "npm installed: $NPM_VERSION" 0
else
    print_check "npm installed" 1
fi

# Check Azure CLI
if command -v az &> /dev/null; then
    print_check "Azure CLI installed" 0
    
    # Check if logged in
    if az account show &> /dev/null; then
        ACCOUNT=$(az account show --query user.name -o tsv)
        print_check "Logged into Azure as: $ACCOUNT" 0
    else
        print_check "Logged into Azure" 1
    fi
else
    print_check "Azure CLI installed" 1
fi

echo ""
echo "Checking project structure..."

# Check required files
REQUIRED_FILES=(
    "package.json"
    "server.ts"
    "index.html"
    "vite.config.ts"
    "tsconfig.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_check "File exists: $file" 0
    else
        print_check "File exists: $file" 1
    fi
done

# Check for node_modules
if [ -d "node_modules" ]; then
    print_check "Dependencies installed (node_modules exists)" 0
else
    print_warning "Dependencies not installed. Run 'npm install'"
fi

# Check environment file
if [ -f ".env.local" ]; then
    print_warning "Found .env.local (ensure it's not committed to git)"
else
    print_check ".env.local not present (good for security)" 0
fi

# Check if .gitignore exists and has proper entries
if [ -f ".gitignore" ]; then
    print_check ".gitignore exists" 0
    
    if grep -q "\.env\.local" .gitignore; then
        print_check ".gitignore contains .env.local" 0
    else
        print_warning ".gitignore should include .env.local"
    fi
    
    if grep -q "node_modules" .gitignore; then
        print_check ".gitignore contains node_modules" 0
    else
        print_warning ".gitignore should include node_modules"
    fi
else
    print_warning ".gitignore not found"
fi

echo ""
echo "Checking build capability..."

# Try to verify package.json has required scripts
if [ -f "package.json" ]; then
    if grep -q '"build"' package.json; then
        print_check "Build script defined in package.json" 0
    else
        print_check "Build script defined in package.json" 1
    fi
    
    if grep -q '"dev"' package.json; then
        print_check "Dev script defined in package.json" 0
    else
        print_warning "Dev script not found in package.json"
    fi
fi

# Check for TypeScript config
if [ -f "tsconfig.json" ]; then
    print_check "TypeScript configuration exists" 0
else
    print_check "TypeScript configuration exists" 1
fi

echo ""
echo "========================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All required checks passed!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}$WARNINGS warning(s) found - review above${NC}"
    fi
    echo ""
    echo "You're ready to deploy! Use one of these methods:"
    echo "  • ./deploy-simple.sh <resource-group> <app-name> <api-key>"
    echo "  • ./deploy-to-azure.ps1 -ResourceGroup <rg> -WebAppName <name>"
    echo "  • GitHub Actions (push to main branch)"
    echo ""
    exit 0
else
    echo -e "${RED}$ERRORS error(s) found - fix before deploying${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}$WARNINGS warning(s) found - review above${NC}"
    fi
    echo ""
    exit 1
fi
