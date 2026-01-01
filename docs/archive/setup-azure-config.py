"""
Helper script to retrieve Azure subscription ID and resource group
and update .env.local with the values
"""

import subprocess
import json
import os
import sys

print("=" * 80)
print("Azure Subscription and Resource Group Lookup")
print("=" * 80)

# Check if az CLI is installed
try:
    result = subprocess.run(["az", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ Azure CLI (az) is not installed or not in PATH")
        print("   Install from: https://learn.microsoft.com/cli/azure/install-azure-cli")
        sys.exit(1)
    print("✅ Azure CLI found\n")
except FileNotFoundError:
    print("❌ Azure CLI (az) is not installed or not in PATH")
    print("   Install from: https://learn.microsoft.com/cli/azure/install-azure-cli")
    sys.exit(1)

# Get subscription ID
print("1. Retrieving Azure subscription ID...")
try:
    result = subprocess.run(
        ["az", "account", "show", "--query", "id", "-o", "tsv"],
        capture_output=True,
        text=True,
        check=True
    )
    subscription_id = result.stdout.strip()
    print(f"   ✅ Subscription ID: {subscription_id}\n")
except subprocess.CalledProcessError as e:
    print(f"   ❌ Failed to get subscription ID: {e.stderr}")
    print("   Make sure you're logged in with: az login")
    sys.exit(1)

# Get resource groups
print("2. Retrieving Azure resource groups...")
try:
    result = subprocess.run(
        ["az", "group", "list", "--query", "[].name", "-o", "tsv"],
        capture_output=True,
        text=True,
        check=True
    )
    resource_groups = result.stdout.strip().split('\n')
    print(f"   ✅ Found {len(resource_groups)} resource group(s):")
    for i, rg in enumerate(resource_groups, 1):
        print(f"      {i}. {rg}")
    print()
except subprocess.CalledProcessError as e:
    print(f"   ❌ Failed to get resource groups: {e.stderr}")
    sys.exit(1)

# Prompt user to select resource group
if len(resource_groups) == 1:
    selected_rg = resource_groups[0]
    print(f"3. Selected resource group: {selected_rg}")
else:
    print("3. Select which resource group to use for AI Foundry:")
    selection = input(f"   Enter number (1-{len(resource_groups)}) or resource group name: ").strip()
    
    if selection.isdigit():
        idx = int(selection) - 1
        if 0 <= idx < len(resource_groups):
            selected_rg = resource_groups[idx]
        else:
            print(f"   ❌ Invalid selection")
            sys.exit(1)
    else:
        if selection in resource_groups:
            selected_rg = selection
        else:
            print(f"   ❌ Resource group '{selection}' not found")
            sys.exit(1)
    print(f"   Selected: {selected_rg}\n")

# Update .env.local
print("4. Updating .env.local...")
env_file = ".env.local"

if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Replace values
    content = content.replace(f'AZURE_SUBSCRIPTION_ID=', f'AZURE_SUBSCRIPTION_ID={subscription_id}')
    content = content.replace(f'AZURE_RESOURCE_GROUP=', f'AZURE_RESOURCE_GROUP={selected_rg}')
    
    with open(env_file, 'w') as f:
        f.write(content)
    
    print(f"   ✅ Updated {env_file}")
else:
    print(f"   ❌ {env_file} not found")
    sys.exit(1)

print("\n" + "=" * 80)
print("CONFIGURATION COMPLETE")
print("=" * 80)
print(f"✅ AZURE_SUBSCRIPTION_ID = {subscription_id}")
print(f"✅ AZURE_RESOURCE_GROUP = {selected_rg}")
print("\nYou can now start the agent bridge service:")
print("   npm run agent-bridge")
print("=" * 80)
