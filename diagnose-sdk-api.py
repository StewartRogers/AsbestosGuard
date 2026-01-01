"""
Diagnostic script to inspect azure-ai-projects SDK and test agent invocation
"""

import os
import sys
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv('.env.local')

print("=" * 80)
print("Azure AI Projects SDK Diagnostic")
print("=" * 80)

# Check environment variables
print("\n1. ENVIRONMENT VARIABLES:")
print("-" * 40)
required_vars = [
    'AZURE_AI_FOUNDRY_PROJECT_ENDPOINT',
    'FOUNDRY_AGENT_1_ID',
    'AZURE_SUBSCRIPTION_ID',
    'AZURE_RESOURCE_GROUP'
]

env_vars = {}
for var in required_vars:
    value = os.getenv(var)
    status = "✅" if value else "❌"
    env_vars[var] = value
    if value:
        if 'ENDPOINT' in var:
            print(f"{status} {var}: {value[:50]}...")
        else:
            print(f"{status} {var}: {value}")
    else:
        print(f"{status} {var}: NOT SET")

# Check SDK version
print("\n2. SDK VERSION:")
print("-" * 40)
try:
    import azure.ai.projects
    print(f"✅ azure-ai-projects installed")
    print(f"   Location: {azure.ai.projects.__file__}")
    if hasattr(azure.ai.projects, '__version__'):
        print(f"   Version: {azure.ai.projects.__version__}")
except ImportError as e:
    print(f"❌ azure-ai-projects not installed: {e}")
    sys.exit(1)

# Inspect AIProjectClient class
print("\n3. AIProjectClient INSPECTION:")
print("-" * 40)
try:
    from azure.ai.projects import AIProjectClient
    
    # Check __init__ signature
    import inspect
    sig = inspect.signature(AIProjectClient.__init__)
    print(f"✅ AIProjectClient found")
    print(f"   Constructor parameters:")
    for param_name, param in sig.parameters.items():
        if param_name != 'self':
            default = f" = {param.default}" if param.default != inspect.Parameter.empty else ""
            print(f"      - {param_name}{default}")
    
except Exception as e:
    print(f"❌ Error inspecting AIProjectClient: {e}")
    sys.exit(1)

# Test client initialization
print("\n4. CLIENT INITIALIZATION TEST:")
print("-" * 40)
try:
    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential
    
    endpoint_url = env_vars['AZURE_AI_FOUNDRY_PROJECT_ENDPOINT']
    parsed = urlparse(endpoint_url)
    endpoint = f"{parsed.scheme}://{parsed.netloc}"
    project_name = parsed.path.split('/')[-1]
    
    print(f"Parsed endpoint: {endpoint}")
    print(f"Parsed project_name: {project_name}")
    
    credential = DefaultAzureCredential()
    
    # Try standard initialization
    try:
        print("\n   Attempting: AIProjectClient(credential, endpoint, project_name)")
        client = AIProjectClient(
            credential=credential,
            endpoint=endpoint,
            project_name=project_name
        )
        print("   ✅ Success with basic parameters")
    except TypeError as te:
        print(f"   ❌ Failed: {te}")
        print("   Trying with additional parameters...")
        
        # Try with subscription_id and resource_group
        try:
            print("\n   Attempting: AIProjectClient(credential, endpoint, project_name, subscription_id, resource_group)")
            client = AIProjectClient(
                credential=credential,
                endpoint=endpoint,
                project_name=project_name,
                subscription_id=env_vars.get('AZURE_SUBSCRIPTION_ID'),
                resource_group=env_vars.get('AZURE_RESOURCE_GROUP')
            )
            print("   ✅ Success with subscription and resource group")
        except Exception as e2:
            print(f"   ❌ Also failed: {e2}")
            raise
    
    # Inspect agents operations
    print("\n5. AGENTS OPERATIONS INSPECTION:")
    print("-" * 40)
    
    agents = client.agents
    print(f"✅ client.agents type: {type(agents).__name__}")
    
    # List all methods
    methods = [m for m in dir(agents) if not m.startswith('_')]
    print(f"\n   Available methods ({len(methods)} total):")
    for method in sorted(methods):
        print(f"      - {method}")
    
    # Check specific methods we need
    print(f"\n   Checking for required methods:")
    required_methods = ['create_thread', 'create_message', 'create_run', 'get_run', 'list_messages', 'delete_thread']
    for method_name in required_methods:
        has_method = hasattr(agents, method_name)
        status = "✅" if has_method else "❌"
        print(f"      {status} {method_name}")
    
    # Try to create a thread
    print("\n6. THREAD CREATION TEST:")
    print("-" * 40)
    try:
        print("   Creating thread...")
        thread = client.agents.create_thread()
        print(f"   ✅ Thread created successfully!")
        print(f"      Thread ID: {thread.id}")
        
        # Clean up
        try:
            client.agents.delete_thread(thread.id)
            print(f"   ✅ Thread deleted successfully")
        except Exception as e:
            print(f"   ⚠️ Error deleting thread: {e}")
        
    except AttributeError as ae:
        print(f"   ❌ AttributeError: {ae}")
        print(f"   The method doesn't exist. Available methods on agents:")
        for m in sorted([x for x in dir(client.agents) if not x.startswith('_')]):
            print(f"      - {m}")
    except Exception as e:
        print(f"   ❌ Error: {type(e).__name__}: {e}")
    
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print("=" * 80)
    print("✅ SDK is installed and client initialized successfully")
    print("Check the output above to verify agent methods are available")
    
except Exception as e:
    print(f"\n❌ Fatal error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
