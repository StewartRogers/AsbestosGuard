# Complete Deployment Script for AsbestosGuard
# 
# DEPRECATED: This script is deprecated in favor of the unified deploy.sh script
# Please use: ./deploy.sh <resource-group> <webapp-name> --skip-infrastructure
# See QUICK_DEPLOY.md for more information
#
# This script builds, packages, and deploys your app to Azure Web App

Write-Host "⚠️  WARNING: This script is deprecated!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please use the new unified deployment script instead:" -ForegroundColor Yellow
Write-Host "  ./deploy.sh <resource-group> <webapp-name> --skip-infrastructure" -ForegroundColor Cyan
Write-Host ""
Write-Host "For help: ./deploy.sh --help"
Write-Host "Quick reference: QUICK_DEPLOY.md"
Write-Host ""
$continue = Read-Host "Continue with this deprecated script anyway? (y/N)"
if ($continue -notmatch '^[Yy]$') {
    exit 1
}
Write-Host ""

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$WebAppName,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipNpmInstall = $false
)

# Color output for better readability
function Write-Header {
    param([string]$message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$message)
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$message)
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Info {
    param([string]$message)
    Write-Host "→ $message" -ForegroundColor Yellow
}

# Check prerequisites
Write-Header "Checking Prerequisites"

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Success "Node.js is installed: $nodeVersion"
} catch {
    Write-Error-Custom "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version 2>&1
    Write-Success "npm is installed: $npmVersion"
} catch {
    Write-Error-Custom "npm is not installed"
    exit 1
}

# Check Azure CLI
try {
    $azVersion = az --version 2>&1 | Select-Object -First 1
    Write-Success "Azure CLI is installed"
} catch {
    Write-Error-Custom "Azure CLI is not installed. Please install it from https://aka.ms/azure-cli"
    exit 1
}

# Verify Azure login
$currentUser = az account show --query user.name -o tsv 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Not logged into Azure. Running 'az login'..."
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Azure login failed"
        exit 1
    }
}
Write-Success "Logged in as: $currentUser"

# ===== STEP 1: Install Dependencies =====
if (-not $SkipNpmInstall) {
    Write-Header "Step 1: Installing Dependencies"
    Write-Info "Running 'npm install'..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "npm install failed"
        exit 1
    }
    Write-Success "Dependencies installed"
} else {
    Write-Info "Skipping npm install (--SkipNpmInstall flag set)"
}

# ===== STEP 2: Build Application =====
if (-not $SkipBuild) {
    Write-Header "Step 2: Building Application"
    
    # Build frontend
    Write-Info "Building frontend (npm run build)..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Frontend build failed"
        exit 1
    }
    Write-Success "Frontend built successfully"
    
    # Verify dist folder exists
    if (-not (Test-Path "dist")) {
        Write-Error-Custom "Build folder 'dist' not found"
        exit 1
    }
    
    # Compile TypeScript server to JavaScript
    Write-Info "Compiling TypeScript server to JavaScript..."
    npx tsc server.ts --module ESNext --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Server compilation failed"
        exit 1
    }
    Write-Success "Server compiled successfully"
    
    # Verify server.js was created
    if (-not (Test-Path "server.js")) {
        Write-Error-Custom "server.js not found after compilation"
        exit 1
    }
} else {
    Write-Info "Skipping build (--SkipBuild flag set)"
}

# ===== STEP 3: Prepare Deployment Package =====
Write-Header "Step 3: Preparing Deployment Package"

# Create deployment folder structure
$deployFolder = ".\deploy-package"
if (Test-Path $deployFolder) {
    Write-Info "Removing existing deployment package..."
    Remove-Item -Path $deployFolder -Recurse -Force
}

Write-Info "Creating deployment package structure..."
New-Item -ItemType Directory -Path $deployFolder -Force | Out-Null

# Copy built frontend (dist folder)
Write-Info "Copying frontend build (dist)..."
Copy-Item -Path "dist" -Destination "$deployFolder\dist" -Recurse -Force

# Copy server files
Write-Info "Copying server files..."
if (Test-Path "server.js") {
    Copy-Item -Path "server.js" -Destination "$deployFolder\" -Force
} else {
    Write-Error-Custom "server.js not found. Build may have failed."
    exit 1
}

# Copy package.json and package-lock.json
Write-Info "Copying package files..."
Copy-Item -Path "package.json" -Destination "$deployFolder\" -Force
if (Test-Path "package-lock.json") {
    Copy-Item -Path "package-lock.json" -Destination "$deployFolder\" -Force
}

# Copy web.config for Azure App Service
if (Test-Path "web.config") {
    Write-Info "Copying web.config..."
    Copy-Item -Path "web.config" -Destination "$deployFolder\" -Force
}

# Copy types.ts if needed by server
if (Test-Path "types.ts") {
    Write-Info "Copying types.ts..."
    Copy-Item -Path "types.ts" -Destination "$deployFolder\" -Force
}

# Create a startup command file for Azure
Write-Info "Creating startup command..."
$startupContent = @"
node server.js
"@
Set-Content -Path "$deployFolder\startup.sh" -Value $startupContent -Force

# Copy services folder if needed by server
if (Test-Path "services") {
    Write-Info "Copying services folder..."
    Copy-Item -Path "services" -Destination "$deployFolder\services" -Recurse -Force
}

# Copy runtime dependencies (node_modules)
if (Test-Path "node_modules") {
    Write-Info "Copying node_modules (runtime dependencies)..."
    Copy-Item -Path "node_modules" -Destination "$deployFolder\node_modules" -Recurse -Force
} else {
    Write-Error-Custom "node_modules not found. Run 'npm install' before deploying."
    exit 1
}

Write-Success "Deployment package prepared"

# ===== STEP 4: Create ZIP Archive =====
Write-Header "Step 4: Creating ZIP Archive"

$zipFile = ".\deploy.zip"
if (Test-Path $zipFile) {
    Write-Info "Removing existing deploy.zip..."
    Remove-Item -Path $zipFile -Force
}

Write-Info "Compressing deployment package..."
Compress-Archive -Path "$deployFolder\*" -DestinationPath $zipFile -Force

if (Test-Path $zipFile) {
    $zipSize = (Get-Item $zipFile).Length / 1MB
    Write-Success "ZIP archive created: deploy.zip ($([math]::Round($zipSize, 2)) MB)"
} else {
    Write-Error-Custom "Failed to create ZIP archive"
    exit 1
}

# Clean up deployment folder
Remove-Item -Path $deployFolder -Recurse -Force

# ===== STEP 5: Deploy to Azure =====
Write-Header "Step 5: Deploying to Azure Web App"

Write-Info "Deploying to Web App: $WebAppName"
Write-Info "Resource Group: $ResourceGroup"

# Disable server-side build since package includes compiled assets and node_modules
Write-Info "Ensuring SCM_DO_BUILD_DURING_DEPLOYMENT is false (run-from-package)..."
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false WEBSITE_RUN_FROM_PACKAGE=1 `
    --output none

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to set SCM_DO_BUILD_DURING_DEPLOYMENT app setting"
    exit 1
}

# Small delay to avoid SCM restart race conditions
Start-Sleep -Seconds 10

az webapp deploy `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --src-path $zipFile `
    --type zip `
    --async true

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Deployment failed"
    exit 1
}

Write-Success "Deployment initiated successfully"

# ===== Summary =====
Write-Header "Deployment Complete"

Write-Success "Application deployed to Azure!"
Write-Info "Web App Name: $WebAppName"
Write-Info "Web App URL: https://$WebAppName.azurewebsites.net"

Write-Host "`nNext steps:" -ForegroundColor Magenta
Write-Host "1. Wait a few minutes for deployment to complete"
Write-Host "2. Visit: https://$WebAppName.azurewebsites.net"
Write-Host "3. Check logs if needed: az webapp log tail --resource-group $ResourceGroup --name $WebAppName"
Write-Host ""

# Clean up zip file
Write-Info "Cleaning up..."
Remove-Item -Path $zipFile -Force
Write-Success "Done!"
