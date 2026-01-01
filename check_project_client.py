#!/usr/bin/env python3
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
import os
from dotenv import load_dotenv

load_dotenv('.env.local')
endpoint = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')
cred = DefaultAzureCredential()
pc = AIProjectClient(endpoint=endpoint, credential=cred)

print("AIProjectClient methods (non-private):")
attrs = [a for a in dir(pc) if not a.startswith('_') and callable(getattr(pc, a))]
for attr in sorted(attrs):
    obj = getattr(pc, attr)
    if hasattr(obj, '__self__'):  # It's a bound method
        print(f"  {attr}()")
    else:
        print(f"  {attr}")
