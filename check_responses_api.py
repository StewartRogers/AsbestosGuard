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

print("OpenAI Client.responses attributes (Responses API):")
if hasattr(oc, 'responses'):
    attrs = [a for a in dir(oc.responses) if not a.startswith('_')]
    for attr in sorted(attrs):
        print(f"  {attr}")
else:
    print("  responses attribute not found")
    
print("\nLooking for create or chat in responses:")
if hasattr(oc, 'responses'):
    create_attr = getattr(oc.responses, 'create', None)
    if create_attr:
        print("  responses.create found!")
        import inspect
        try:
            sig = inspect.signature(create_attr)
            print(f"  Signature: {sig}")
        except:
            pass
