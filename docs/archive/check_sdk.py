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

print("OpenAI Client attributes related to agents/threads/runs:")
attrs = [a for a in dir(oc) if not a.startswith('_')]
for attr in sorted(attrs):
    print(f"  {attr}")
