#!/usr/bin/env python3
"""
Test the Azure AI Projects SDK directly to understand the correct API usage
"""

import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
import dotenv

dotenv.load_dotenv('.env.local')

endpoint = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')
agent_id = os.getenv('FOUNDRY_AGENT_1_ID', 'EFSAGENT')

print(f"Testing direct SDK usage...")
print(f"Endpoint: {endpoint}")
print(f"Agent ID: {agent_id}")
print()

try:
    credential = DefaultAzureCredential()
    client = AIProjectClient(endpoint=endpoint, credential=credential)
    print(f"✓ Client created")
    
    # Test available methods
    print(f"\nAvailable agent methods:")
    agent_methods = [m for m in dir(client.agents) if not m.startswith('_')]
    for method in agent_methods:
        print(f"  - {method}")
    
    # Try to get the agent
    print(f"\nTrying to get agent {agent_id}...")
    agent = client.agents.get(agent_id)
    print(f"✓ Got agent: {agent.get('name') if isinstance(agent, dict) else agent}")
    
    # Try using the OpenAI client for thread operations
    print(f"\n\nTrying to use OpenAI client for thread operations...")
    try:
        openai_client = client.get_openai_client()
        print(f"✓ Got OpenAI client")
        print(f"  OpenAI client type: {type(openai_client)}")
        print(f"  Has threads attr: {hasattr(openai_client, 'beta')}")
        
        if hasattr(openai_client, 'beta'):
            print(f"  OpenAI beta methods: {[m for m in dir(openai_client.beta) if not m.startswith('_')][:10]}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
