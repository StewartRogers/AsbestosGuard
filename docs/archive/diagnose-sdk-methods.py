"""
Diagnostic script to understand the actual azure-ai-projects SDK API structure
"""

from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

FOUNDRY_ENDPOINT = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')

# Parse endpoint
import urllib.parse
parsed_url = urllib.parse.urlparse(FOUNDRY_ENDPOINT)
endpoint = f"{parsed_url.scheme}://{parsed_url.netloc}"
path_parts = parsed_url.path.split('/')
project_name = path_parts[-1] if path_parts[-1] else None

print("=" * 80)
print("Azure AI Projects SDK Method Discovery")
print("=" * 80)
print(f"\nEndpoint: {endpoint}")
print(f"Project: {project_name}")

try:
    credential = DefaultAzureCredential()
    client = AIProjectClient(
        credential=credential,
        endpoint=endpoint,
        project_name=project_name
    )
    
    print("\n✅ Client created successfully\n")
    
    # Check what's available on agents
    print("Methods available on client.agents:")
    print("-" * 40)
    agents_methods = [m for m in dir(client.agents) if not m.startswith('_')]
    for method in sorted(agents_methods):
        print(f"  - {method}")
    
    # Check for nested attributes
    print("\nNested objects on client.agents:")
    print("-" * 40)
    for attr in ['threads', 'messages', 'runs', 'assistants']:
        if hasattr(client.agents, attr):
            print(f"  ✅ client.agents.{attr} exists")
            obj = getattr(client.agents, attr)
            methods = [m for m in dir(obj) if not m.startswith('_') and callable(getattr(obj, m))]
            for method in sorted(methods)[:10]:  # Show first 10
                print(f"      - {method}")
        else:
            print(f"  ❌ client.agents.{attr} does NOT exist")
    
    # Check for direct create methods
    print("\nDirect methods on agents (looking for create_*):")
    print("-" * 40)
    create_methods = [m for m in dir(client.agents) if m.startswith('create_')]
    if create_methods:
        for method in sorted(create_methods):
            print(f"  ✅ {method}")
    else:
        print("  ❌ No create_* methods found")
    
    # Try to discover the actual invocation pattern
    print("\n" + "=" * 80)
    print("Testing actual invocation pattern:")
    print("=" * 80)
    
    try:
        print("\n1. Testing thread creation...")
        
        # Try different approaches
        if hasattr(client.agents, 'create_thread'):
            print("   ✅ client.agents.create_thread() exists")
        elif hasattr(client.agents, 'threads') and hasattr(client.agents.threads, 'create'):
            print("   ✅ client.agents.threads.create() exists")
        else:
            print("   ❌ No thread creation method found")
        
        print("\n2. Testing message creation...")
        if hasattr(client.agents, 'create_message'):
            print("   ✅ client.agents.create_message() exists")
        elif hasattr(client.agents, 'messages') and hasattr(client.agents.messages, 'create'):
            print("   ✅ client.agents.messages.create() exists")
        else:
            print("   ❌ No message creation method found")
        
        print("\n3. Testing run creation...")
        if hasattr(client.agents, 'create_run'):
            print("   ✅ client.agents.create_run() exists")
        elif hasattr(client.agents, 'runs') and hasattr(client.agents.runs, 'create'):
            print("   ✅ client.agents.runs.create() exists")
        else:
            print("   ❌ No run creation method found")
            
    except Exception as e:
        print(f"Error during testing: {e}")
    
except Exception as e:
    print(f"\n❌ Error creating client: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
