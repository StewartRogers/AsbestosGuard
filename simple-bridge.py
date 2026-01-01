#!/usr/bin/env python3
"""
Minimal test bridge service to verify FastAPI/Uvicorn is working
"""
import os
from fastapi import FastAPI
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv('.env.local')

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok", "endpoint": os.getenv('AZURE_AI_FOUNDRY_PROJECT_ENDPOINT')}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting minimal bridge service...")
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="debug")
