#!/usr/bin/env python3
"""
Minimal Mock Agent Bridge for Testing
Returns a hardcoded response to verify the integration works
"""
import json
from fastapi import FastAPI
from pydantic import BaseModel
import asyncio

app = FastAPI()

class InvokeRequest(BaseModel):
    agent_id: str
    prompt: str
    timeout_ms: int = 60000

@app.get("/health")
async def health():
    return {"status": "ok", "agents": ["EFSAGENT", "APPRISKANALYSIS", "EMPWEBPROFILEAGENT"]}

@app.post("/invoke")
async def invoke(req: InvokeRequest):
    # Mock response for testing
    await asyncio.sleep(0.5)
    mock_analysis = {
        "riskScore": "LOW",
        "isTestAccount": False,
        "summary": "Mock analysis: Application appears compliant. No asbestos concerns detected.",
        "concerns": [],
        "requiredActions": [],
        "confidence": 0.95
    }
    return {
        "response": json.dumps(mock_analysis),  # Return as JSON string so it can be parsed
        "duration_ms": 500,
        "agent_id": req.agent_id
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting MOCK bridge service on 127.0.0.1:8001...")
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
