# PowerShell deployment helper - deploy-simple.ps1
# Usage: .\deploy-simple.ps1 -ResourceGroup <rg> -WebAppName <name> [-GeminiApiKey <key>]
# Requires: Azure CLI logged in, Node, npm, tsc (via npx)
param(
    [Parameter(Mandatory=$true)][string]$ResourceGroup,
    [Parameter(Mandatory=$true)][string]$WebAppName,
    [Parameter(Mandatory=$false)][string]$GeminiApiKey
)

$ErrorActionPreference = 'Stop'

function Write-Ok($msg){ Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Err($msg){ Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info($msg){ Write-Host "→ $msg" -ForegroundColor Yellow }

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploy Simple (PowerShell)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Load .env.local if present
if (Test-Path -Path .\.env.local) {
    Write-Info "Loading .env.local"
    try {
        $lines = Get-Content .\.env.local -ErrorAction Stop
        $count = 0
        foreach ($raw in $lines) {
            $line = $raw.Trim()
            if ($line -eq '' -or $line.StartsWith('#')) { continue }
            if ($line -match '^(?<k>[^=]+)=(?<v>.*)$') {
                $k = $Matches['k'].Trim()
                $v = $Matches['v'].Trim('"')
                [Environment]::SetEnvironmentVariable($k, $v, 'Process')
                $count++
            }
        }
        Write-Ok ".env.local loaded ($count variables)"
    } catch {
        Write-Err "Failed to read .env.local: $_"
        # continue - don't abort here, let later checks fail with clearer messages
    }

    # Diagnostic: show whether GEMINI_API_KEY is now set (mask value)
    $g = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY','Process')
    if ($null -ne $g -and $g -ne '') {
        $mask = if ($g.Length -gt 8) { $g.Substring(0,4) + '...' + $g.Substring($g.Length-4,4) } else { '***' }
        Write-Info "GEMINI_API_KEY present in environment: $mask"
    } else {
        Write-Info "GEMINI_API_KEY not set in environment after loading .env.local"
    }
}

# Prefer provided param, then environment variable
if ([string]::IsNullOrEmpty($GeminiApiKey)) {
    $GeminiApiKey = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY', 'Process')
}

if ([string]::IsNullOrEmpty($GeminiApiKey)) {
    Write-Err "GEMINI API key not provided. Pass -GeminiApiKey or set GEMINI_API_KEY in .env.local or environment."
    exit 1
}

# Prerequisites
Write-Info "Checking prerequisites"
try {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw 'Azure CLI (az) not found' }
    Write-Ok "Azure CLI available"
    az account show > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Not logged in to Azure. Run: az login' }
    Write-Ok "Logged into Azure"
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js not found' }
    Write-Ok "Node.js: $(node --version)"
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm not found' }
    Write-Ok "npm: $(npm --version)"
} catch {
    Write-Err $_
    exit 1
}

# Install dependencies
Write-Host ''
Write-Info "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed"; exit 1 }
Write-Ok "Dependencies installed"

# Build
Write-Info "Building application"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "npm run build failed"; exit 1 }
Write-Ok "Frontend built"

# Compile server.ts (if present)
if (Test-Path -Path .\server.ts) {
    Write-Info "Compiling server.ts"
    npx tsc server.ts --module ESNext --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck
    if ($LASTEXITCODE -ne 0) { Write-Err "TypeScript compilation failed"; exit 1 }
    if (Test-Path -Path .\server.js) { Write-Ok "Server compiled" } else { Write-Info "server.js not produced; continuing" }
}

# Configure app settings
Write-Info "Configuring application settings (GEMINI_API_KEY & production settings)"
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --settings "GEMINI_API_KEY=$GeminiApiKey" "NODE_ENV=production" "WEBSITE_NODE_DEFAULT_VERSION=18-lts" "SCM_DO_BUILD_DURING_DEPLOYMENT=true" `
    --output none
if ($LASTEXITCODE -eq 0) { Write-Ok "Application settings configured" } else { Write-Err "Failed to set app settings"; exit 1 }

# Deploy using zip (async) - create a temporary ZIP to avoid path issues on Windows
Write-Info "Starting ZIP deployment"
$tempZip = Join-Path -Path $env:TEMP -ChildPath ("${WebAppName}-{0}.zip" -f ([System.Guid]::NewGuid().ToString()))
if (Test-Path $tempZip) { Remove-Item $tempZip -Force }

Write-Info "Creating deployment ZIP: $tempZip"
try {
    # Compress-Archive will include hidden files; use Get-ChildItem to include contents of current dir
    $items = Get-ChildItem -LiteralPath . -Force
    Compress-Archive -LiteralPath $items -DestinationPath $tempZip -Force
} catch {
    Write-Err "Failed to create ZIP: $_"
    exit 1
}

az webapp deploy --resource-group $ResourceGroup --name $WebAppName --src-path $tempZip --type zip --async true
if ($LASTEXITCODE -eq 0) {
    Write-Ok "Deployment initiated"
} else {
    Write-Err "Deployment failed"
    if (Test-Path $tempZip) { Remove-Item $tempZip -Force }
    exit 1
}

# Clean up temp zip
if (Test-Path $tempZip) { Remove-Item $tempZip -Force }

# Resolve and print the actual web app hostname
Write-Info "Resolving web app hostname"
try {
    $hostJson = az webapp show --resource-group $ResourceGroup --name $WebAppName -o json 2>$null
    if ($LASTEXITCODE -eq 0 -and $hostJson) {
        $hostObj = $hostJson | ConvertFrom-Json
        if ($hostObj.defaultHostName) {
            Write-Ok "App available at: https://$($hostObj.defaultHostName)"
            exit 0
        }
    }
} catch {
    # ignore and try fallback
}

# Fallback: search for a similarly named app in the resource group
Write-Info "Falling back to search web apps in resource group"
try {
    $listJson = az webapp list --resource-group $ResourceGroup -o json
    if ($LASTEXITCODE -eq 0 -and $listJson) {
        $apps = $listJson | ConvertFrom-Json
        $match = $apps | Where-Object { $_.name -like "*$WebAppName*" } | Select-Object -First 1
        if ($match) {
            Write-Ok "Found app: $($match.name) at: https://$($match.defaultHostName)"
        } else {
            Write-Err "Could not determine hostname automatically. Check the Azure portal for the correct web app name."
        }
    } else {
        Write-Err "Could not list web apps in resource group to determine hostname."
    }
} catch {
    Write-Err "Error while determining hostname: $_"
}

Write-Host ''
Write-Host "Deployment complete. Visit: https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Tail logs: az webapp log tail --resource-group $ResourceGroup --name $WebAppName" -ForegroundColor Cyan

# End of script
