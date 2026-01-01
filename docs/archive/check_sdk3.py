#!/usr/bin/env python3
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
import os
from dotenv import load_dotenv

load_dotenv('.env.local')
endpoint = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')
cred = DefaultAzureCredential()
pc = AIProjectClient(endpoint=endpoint, credential=cred)
oc = pc.get_openai_client()

print("OpenAI Client.beta.threads attributes:")
attrs = [a for a in dir(oc.beta.threads) if not a.startswith('_')]
for attr in sorted(attrs):
    print(f"  {attr}")
    
print("\nChecking if create_and_run exists:")
if hasattr(oc.beta.threads, 'create_and_run'):
    print("  YES - create_and_run exists")
    # Try to get its signature
    import inspect
    try:
        sig = inspect.signature(oc.beta.threads.create_and_run)
        print(f"  Signature: {sig}")
    except:
        print("  Could not get signature")
else:
    print("  NO - create_and_run does NOT exist")
