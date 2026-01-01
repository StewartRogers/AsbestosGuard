"""
Quick test to check which Azure SDK API methods exist
"""
import sys

try:
    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential
    import os
    
    endpoint = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')
    
    if not endpoint:
        print("❌ AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set")
        sys.exit(1)
    
    print("🔗 Creating AIProjectClient...")
    credential = DefaultAzureCredential()
    client = AIProjectClient(endpoint=endpoint, credential=credential)
    
    print("✅ Client created\n")
    print("📋 Checking available methods:\n")
    
    # Check threads API
    print("Threads API:")
    if hasattr(client.agents, 'threads'):
        print("  ✅ client.agents.threads exists")
        threads = client.agents.threads
        if hasattr(threads, 'create'):
            print("    ✅ client.agents.threads.create()")
        if hasattr(threads, 'create_and_process_run'):
            print("    ✅ client.agents.threads.create_and_process_run()")
        if hasattr(threads, 'create_message'):
            print("    ✅ client.agents.threads.create_message()")
        if hasattr(threads, 'list_messages'):
            print("    ✅ client.agents.threads.list_messages()")
        if hasattr(threads, 'delete'):
            print("    ✅ client.agents.threads.delete()")
    else:
        print("  ❌ client.agents.threads does NOT exist")
    
    # Check legacy API
    print("\nLegacy API (client.agents):")
    if hasattr(client.agents, 'create_thread'):
        print("  ✅ client.agents.create_thread()")
    else:
        print("  ❌ client.agents.create_thread() does NOT exist")
    
    if hasattr(client.agents, 'create_run'):
        print("  ✅ client.agents.create_run()")
    else:
        print("  ❌ client.agents.create_run() does NOT exist")
    
    if hasattr(client.agents, 'create_message'):
        print("  ✅ client.agents.create_message()")
    else:
        print("  ❌ client.agents.create_message() does NOT exist")
    
    if hasattr(client.agents, 'list_messages'):
        print("  ✅ client.agents.list_messages()")
    else:
        print("  ❌ client.agents.list_messages() does NOT exist")
    
    if hasattr(client.agents, 'delete_thread'):
        print("  ✅ client.agents.delete_thread()")
    else:
        print("  ❌ client.agents.delete_thread() does NOT exist")
    
    print("\n✅ API check complete")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
