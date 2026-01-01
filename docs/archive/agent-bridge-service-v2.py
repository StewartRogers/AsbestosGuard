#!/usr/bin/env python3
"""
Azure AI Foundry Agent Bridge Service - SIMPLIFIED VERSION
Uses OpenAI client from AIProjectClient for thread/run operations
"""

import os
import time
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env.local')

app = FastAPI(title="Azure AI Foundry Agent Bridge", version="1.0.0")

# Azure AI configuration
FOUNDRY_ENDPOINT = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')
AGENT_1_ID = os.getenv('FOUNDRY_AGENT_1_ID', 'EFSAGENT')
AGENT_2_ID = os.getenv('FOUNDRY_AGENT_2_ID', 'APPRISKANALYSIS')
AGENT_3_ID = os.getenv('FOUNDRY_AGENT_3_ID', 'EMPWEBPROFILEAGENT')

class InvokeRequest(BaseModel):
    agent_id: str
    prompt: str
    timeout_ms: Optional[int] = 60000

class InvokeResponse(BaseModel):
    response: str
    duration_ms: int
    agent_id: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "endpoint": FOUNDRY_ENDPOINT,
        "agents_configured": {
            "agent1": AGENT_1_ID,
            "agent2": AGENT_2_ID,
            "agent3": AGENT_3_ID
        }
    }

@app.post("/invoke", response_model=InvokeResponse)
async def invoke_agent(request: InvokeRequest):
    """
    Invoke an Azure AI Foundry agent via direct REST endpoint
    """
    start = time.time()
    
    try:
        logger.info(f"Invoking agent: {request.agent_id}")
        logger.info(f"Prompt length: {len(request.prompt)} chars")
        
        if not FOUNDRY_ENDPOINT:
            raise HTTPException(status_code=500, detail="AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set")
        
        logger.info(f"Using endpoint: {FOUNDRY_ENDPOINT}")
        
        # Get auth token
        credential = DefaultAzureCredential()
        token = credential.get_token("https://ai.azure.com/.default").token
        
        # Invoke agent via direct REST call to agent endpoint
        logger.info(f"Invoking {request.agent_id} directly...")
        
        # Agent endpoint: POST to the agent with user message
        agent_url = f"{FOUNDRY_ENDPOINT}/agents/{request.agent_id}?api-version=2025-05-15-preview"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Send message to agent
        payload = {
            "message": request.prompt
        }
        
        import requests
        logger.info(f"POST {agent_url}")
        response = requests.post(
            agent_url,
            headers=headers,
            json=payload,
            timeout=request.timeout_ms / 1000
        )
        
        logger.info(f"Agent responded with status {response.status_code}")
        
        if response.status_code not in [200, 201]:
            logger.error(f"Response: {response.text}")
            raise Exception(f"Agent returned {response.status_code}: {response.text}")
        
        result = response.json()
        
        # Extract response text from the result
        response_text = ""
        if isinstance(result, dict):
            if "message" in result:
                response_text = result["message"]
            elif "reply" in result:
                response_text = result["reply"]
            elif "response" in result:
                response_text = result["response"]
            elif "output" in result:
                response_text = result["output"]
            else:
                # Try to find any string content in the response
                for key, value in result.items():
                    if isinstance(value, str) and value.strip():
                        response_text = value
                        logger.info(f"Using '{key}' field for response")
                        break
        
        if not response_text:
            response_text = str(result) if result else "(No response)"
        
        duration = int((time.time() - start) * 1000)
        logger.info(f"Agent responded in {duration}ms")
        logger.info(f"Response length: {len(response_text)} chars")
        
        return InvokeResponse(
            response=response_text,
            duration_ms=duration,
            agent_id=request.agent_id
        )
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        logger.error(f"Agent invocation failed after {duration}ms: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Agent invocation failed: {str(e)}"
        )

@app.get("/agents")
async def list_agents():
    """List configured agents"""
    return {
        "agents": [
            {"id": AGENT_1_ID, "name": "Agent 1"},
            {"id": AGENT_2_ID, "name": "Agent 2"},
            {"id": AGENT_3_ID, "name": "Agent 3"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Azure AI Foundry Agent Bridge Service")
    logger.info(f"Endpoint: {FOUNDRY_ENDPOINT}")
    logger.info(f"Agents: {AGENT_1_ID}, {AGENT_2_ID}, {AGENT_3_ID}")
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
