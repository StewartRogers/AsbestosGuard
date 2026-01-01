"""
Azure AI Foundry Native Agent Bridge Service
Provides REST API bridge between Node.js/TypeScript and Azure AI Foundry native agents
Uses Azure AI Projects SDK (AIProjectClient) for native agent support
"""

import os
import time
import asyncio
import httpx
from typing import Optional
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env.local')

app = FastAPI(title="Azure AI Foundry Agent Bridge", version="1.0.0")

# Azure AI configuration
FOUNDRY_ENDPOINT = os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')
AGENT_1_ID = os.getenv('FOUNDRY_AGENT_1_ID', 'EFSAGENT')
AGENT_2_ID = os.getenv('FOUNDRY_AGENT_2_ID', 'APPRISKANALYSIS')
AGENT_3_ID = os.getenv('FOUNDRY_AGENT_3_ID', 'EMPWEBPROFILEAGENT')

if FOUNDRY_ENDPOINT:
    logger.info(f'✅ Using Foundry endpoint: {FOUNDRY_ENDPOINT}')
else:
    logger.warning('⚠️ AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set!')

logger.info(f'📋 Configured agents: {AGENT_1_ID}, {AGENT_2_ID}, {AGENT_3_ID}')

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

async def invoke_agent_async(agent_id: str, prompt: str, timeout_ms: int):
    """Invoke Azure AI Foundry native agent via REST API"""
    try:
        logger.info(f"📤 Invoking native agent: {agent_id}")
        
        credential = DefaultAzureCredential()
        token = credential.get_token("https://ai.azure.com/.default")
        
        headers = {
            "Authorization": f"Bearer {token.token}",
            "Content-Type": "application/json"
        }
        
        # Use the Agent Service API endpoint (not Assistants)
        base_url = FOUNDRY_ENDPOINT.rstrip('/')
        
        start_time = time.time()
        async with httpx.AsyncClient() as client:
            # Invoke agent directly
            response = await client.post(
                f"{base_url}/agents/{agent_id}:invoke",
                headers=headers,
                json={"input": prompt},
                timeout=timeout_ms / 1000
            )
            
            response.raise_for_status()
            result = response.json()
        
        elapsed = time.time() - start_time
        
        output = result.get("output", result.get("response", str(result)))
        logger.info(f"✅ Agent completed in {elapsed:.1f}s")
        return output
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        raise

@app.post("/invoke", response_model=InvokeResponse)
async def invoke_agent(request: InvokeRequest):
    """Invoke an Azure AI Foundry native agent"""
    start = time.time()
    
    try:
        if not request.agent_id or not request.prompt:
            raise HTTPException(status_code=400, detail="agent_id and prompt are required")
        
        logger.info(f"📤 Agent invocation: {request.agent_id}")
        
        if not FOUNDRY_ENDPOINT:
            raise HTTPException(status_code=500, detail="FOUNDRY_ENDPOINT not configured")
        
        # Invoke agent asynchronously
        response_text = await invoke_agent_async(
            request.agent_id, 
            request.prompt, 
            request.timeout_ms
        )
        
        duration = int((time.time() - start) * 1000)
        
        logger.info(f"✅ Agent completed in {duration}ms")
        
        return InvokeResponse(
            response=response_text,
            duration_ms=duration,
            agent_id=request.agent_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        logger.error(f"❌ Agent invocation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent invocation failed: {str(e)}")

@app.get("/agents")
async def list_agents():
    """List configured agents"""
    return {
        "agents": [
            {"id": AGENT_1_ID},
            {"id": AGENT_2_ID},
            {"id": AGENT_3_ID}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("=" * 60)
    logger.info("🚀 Starting Azure AI Foundry Agent Bridge Service")
    logger.info("=" * 60)
    logger.info(f"📍 Endpoint: {FOUNDRY_ENDPOINT or '❌ NOT SET - Set AZURE_AI_FOUNDRY_PROJECT_ENDPOINT'}")
    logger.info(f"📋 Configured Agents:")
    logger.info(f"   1. {AGENT_1_ID}")
    logger.info(f"   2. {AGENT_2_ID}")
    logger.info(f"   3. {AGENT_3_ID}")
    logger.info(f"🔌 Server: http://127.0.0.1:8001")
    logger.info(f"🏥 Health check: http://127.0.0.1:8001/health")
    logger.info(f"📚 API docs: http://127.0.0.1:8001/docs")
    logger.info("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
