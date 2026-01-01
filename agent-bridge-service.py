"""
Azure AI Foundry Agent Bridge Service
Simplified for published applications
"""

import os
import time
import logging
from typing import Optional, Dict

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from azure.identity import DefaultAzureCredential

# ---------------------------------------------------------------------
# Load environment
# ---------------------------------------------------------------------
load_dotenv(".env.local")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger("foundry-agent-bridge")

# Credential for Bearer tokens
credential = DefaultAzureCredential()
AI_SCOPE = "https://ai.azure.com/.default"

# ---------------------------------------------------------------------
# Agent endpoints (from env.local)
# ---------------------------------------------------------------------
AGENT_RESPONSES_URLS: Dict[str, str] = {
    "EMPFACTSHEET": os.getenv("FOUNDRY_AGENT_1_RESPONSES_URL"),
    "APPRISKANALYSIS": os.getenv("FOUNDRY_AGENT_2_RESPONSES_URL"),
    "EMPWEBPROFILEAGENT": os.getenv("FOUNDRY_AGENT_3_RESPONSES_URL"),
}

for name, url in AGENT_RESPONSES_URLS.items():
    if not url:
        raise RuntimeError(f"Missing RESPONSES_URL for agent {name}")

# ---------------------------------------------------------------------
# Token cache
# ---------------------------------------------------------------------
_TOKEN_CACHE = {"token": None, "expires": 0}


def _get_bearer_token() -> str:
    now = time.time()
    if _TOKEN_CACHE["token"] and now < _TOKEN_CACHE["expires"] - 60:
        return _TOKEN_CACHE["token"]
    token = credential.get_token(AI_SCOPE)
    _TOKEN_CACHE["token"] = token.token
    _TOKEN_CACHE["expires"] = token.expires_on
    return token.token


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------
class InvokeRequest(BaseModel):
    agent_id: str
    prompt: str
    timeout_ms: Optional[int] = 60000


class InvokeResponse(BaseModel):
    agent_id: str
    response: str
    duration_ms: int


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def _invoke_agent(responses_url: str, prompt: str, timeout_ms: int) -> str:
    headers = {
        "Authorization": f"Bearer {_get_bearer_token()}",
        "Content-Type": "application/json"
    }
    payload = {"input": prompt}

    resp = requests.post(
        responses_url,
        headers=headers,
        json=payload,
        timeout=timeout_ms / 1000
    )

    if resp.status_code >= 400:
        raise RuntimeError(
            f"Responses API failed ({resp.status_code}): {resp.text}"
        )

    # Extract text from OpenAI-compatible responses
    data = resp.json()
    for item in data.get("output", []):
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    return content.get("text")
    raise RuntimeError("No text output returned from agent")


# ---------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------
app = FastAPI(
    title="Azure AI Foundry Agent Bridge",
    version="1.0.0"
)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "agents": list(AGENT_RESPONSES_URLS.keys())
    }


@app.post("/invoke", response_model=InvokeResponse)
async def invoke(request: InvokeRequest):
    if request.agent_id not in AGENT_RESPONSES_URLS:
        raise HTTPException(400, f"Unknown agent_id '{request.agent_id}'")

    responses_url = AGENT_RESPONSES_URLS[request.agent_id]

    start = time.time()
    try:
        text = _invoke_agent(
            responses_url=responses_url,
            prompt=request.prompt,
            timeout_ms=request.timeout_ms
        )
    except Exception as e:
        logger.error(str(e))
        raise HTTPException(500, f"Agent invocation failed: {e}")

    duration = int((time.time() - start) * 1000)
    return InvokeResponse(
        agent_id=request.agent_id,
        response=text,
        duration_ms=duration
    )


# ---------------------------------------------------------------------
# Local run
# ---------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
