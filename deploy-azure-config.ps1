# Azure Configuration Script for AsbestosGuard
# This script automates the setup of Azure resources: Storage Account, Web App, and Managed Identity

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$StorageAccountName,
    
    [Parameter(Mandatory=$true)]
    [string]$WebAppName,
    
    [Parameter(Mandatory=$true)]
    [string]$GeminiApiKey,
    
    [Parameter(Mandatory=$false)]
    [string]$WebAppUrl = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipManagedIdentity = $false
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

# Check if Azure CLI is installed
Write-Header "Checking Prerequisites"
try {
    $azVersion = az --version 2>&1 | Select-Object -First 1
    Write-Success "Azure CLI is installed: $azVersion"
} catch {
    Write-Error-Custom "Azure CLI is not installed. Please install it from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Verify user is logged in
$currentUser = az account show --query user.name -o tsv 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Not logged into Azure. Running 'az login'..."
    az login
}
else {
    Write-Success "Logged in as: $currentUser"
}

# Get current subscription
$subscription = az account show --query id -o tsv
Write-Info "Using subscription: $subscription"

# ===== STEP 1: Configure Storage Account =====
Write-Header "Step 1: Configuring Storage Account"

try {
    # Get storage account connection string
    Write-Info "Retrieving storage account connection string..."
    $connectionString = az storage account show-connection-string `
        --resource-group $ResourceGroup `
        --name $StorageAccountName `
        --query connectionString -o tsv
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get connection string"
    }
    Write-Success "Storage account connection string retrieved"
    
    # Create blob containers
    $containers = @("applications", "fact-sheets", "analysis", "policies", "data")
    
    foreach ($container in $containers) {
        Write-Info "Creating container: $container"
        az storage container create `
            --name $container `
            --account-name $StorageAccountName `
            --public-access off `
            --account-key (az storage account keys list -g $ResourceGroup -n $StorageAccountName --query '[0].value' -o tsv) `
            --only-show-errors
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Container '$container' created or already exists"
        }
    }
    
    # Enable CORS if WebAppUrl is provided
    if ($WebAppUrl) {
        Write-Info "Configuring CORS for: $WebAppUrl"
        az storage cors add `
            --services b `
            --methods GET POST PUT DELETE `
            --origins $WebAppUrl `
            --allowed-headers "*" `
            --exposed-headers "*" `
            --max-age 3600 `
            --account-name $StorageAccountName `
            --account-key (az storage account keys list -g $ResourceGroup -n $StorageAccountName --query '[0].value' -o tsv)
        
        Write-Success "CORS configured"
    }
    
} catch {
    Write-Error-Custom "Error configuring storage account: $_"
    exit 1
}

# ===== STEP 2: Enable Managed Identity =====
Write-Header "Step 2: Configuring Web App and Managed Identity"

try {
    if (-not $SkipManagedIdentity) {
        Write-Info "Enabling managed identity on Web App..."
        az webapp identity assign `
            --resource-group $ResourceGroup `
            --name $WebAppName `
            --query principalId -o tsv | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Managed identity enabled"
        }
        
        # Get the managed identity principal ID
        $principalId = az webapp identity show `
            --resource-group $ResourceGroup `
            --name $WebAppName `
            --query principalId -o tsv
        
        Write-Info "Managed Identity Principal ID: $principalId"
        
        # Wait a moment for identity to be created
        Start-Sleep -Seconds 3
        
        # Get storage account resource ID
        $storageResourceId = az storage account show `
            --resource-group $ResourceGroup `
            --name $StorageAccountName `
            --query id -o tsv
        
        # Assign Storage Blob Data Contributor role
        Write-Info "Assigning Storage Blob Data Contributor role..."
        az role assignment create `
            --assignee-object-id $principalId `
            --role "Storage Blob Data Contributor" `
            --scope $storageResourceId `
            --only-show-errors
        
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 409) {  # 409 = role already assigned
            Write-Success "Storage Blob Data Contributor role assigned (or already exists)"
        }
    } else {
        Write-Info "Skipping managed identity configuration (--SkipManagedIdentity flag set)"
    }
    
} catch {
    Write-Error-Custom "Error configuring managed identity: $_"
    exit 1
}

# ===== STEP 3: Configure Application Settings =====
Write-Header "Step 3: Configuring Application Settings"

try {
    Write-Info "Setting application configuration variables..."
    
    # Set required application settings
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $WebAppName `
        --settings `
        AZURE_STORAGE_ACCOUNT_NAME=$StorageAccountName `
        GEMINI_API_KEY=$GeminiApiKey `
        NODE_ENV=production `
        WEBSITE_NODE_DEFAULT_VERSION="18-lts" `
        SCM_DO_BUILD_DURING_DEPLOYMENT=true `
        --output none
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Application settings configured"
    }
    
    # Display the settings
    Write-Info "Current application settings:"
    az webapp config appsettings list `
        --resource-group $ResourceGroup `
        --name $WebAppName `
        --query "[].{name:name, value:value}" -o table
    
} catch {
    Write-Error-Custom "Error setting application settings: $_"
    exit 1
}

# ===== Summary =====
Write-Header "Configuration Complete"

Write-Success "Azure configuration completed successfully!"
Write-Info "Web App: $WebAppName"
Write-Info "Storage Account: $StorageAccountName"
Write-Info "Resource Group: $ResourceGroup"

Write-Host "`nNext steps:" -ForegroundColor Magenta
Write-Host "1. Build your application: npm run build"
Write-Host "2. Deploy to Web App using one of these methods:"
Write-Host "   - Azure CLI: az webapp deployment source config-zip --resource-group $ResourceGroup --name $WebAppName --src ./build.zip"
Write-Host "   - VS Code: Right-click the Web App and select 'Deploy to Web App'"
Write-Host "   - GitHub Actions: Push to your repository with a configured workflow"
Write-Host ""
