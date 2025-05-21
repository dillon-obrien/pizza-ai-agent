#!/usr/bin/env python
import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
from dotenv import load_dotenv

# Import our agent implementation
from pizza_agent_python import (
    setup_multi_agent_system, 
    MenuPlugin,
    OrderPlugin
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("pizza-api-server")

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Pizza Agent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active threads for cleanup
active_threads = {}

# Models
class MessageRequest(BaseModel):
    message: str
    threadId: Optional[str] = None

class MessageResponse(BaseModel):
    response: str
    threadId: str
    functionCalls: List[Dict[str, Any]] = []
    functionResults: List[Dict[str, Any]] = []

# Initialize our multi-agent system
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Pizza Agent API server")
    # Pre-initialize the agent system
    try:
        global agent_system
        agent_system = await setup_multi_agent_system()
        logger.info("Multi-agent system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize multi-agent system: {str(e)}")
        raise

# Process a message with the agent
@app.post("/api/agent", response_model=MessageResponse)
async def process_message(request: MessageRequest):
    try:
        logger.info(f"Processing message: {request.message}")
        logger.info(f"Thread ID: {request.threadId}")
        
        thread_id = request.threadId or f"thread-{len(active_threads) + 1}"
        
        # Get a response from the agent
        response = await agent_system.get_response(
            messages=request.message,
            thread=active_threads.get(thread_id)
        )
        
        if response:
            # Store the thread for future interactions
            active_threads[thread_id] = response.thread
            
            return MessageResponse(
                response=response.content,
                threadId=thread_id,
                functionCalls=[],  # Our implementation handles these internally
                functionResults=[]
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to get response from agent")
            
    except Exception as e:
        logger.error(f"Error in process_message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Stream a response from the agent
@app.post("/api/agent/stream")
async def stream_message(request: MessageRequest):
    async def generate():
        try:
            thread_id = request.threadId or f"thread-{len(active_threads) + 1}"
            
            # Send initial response
            yield json.dumps({
                "content": "Thinking...",
                "type": "init"
            }).encode() + b"\n"
            
            # Send thread ID
            yield json.dumps({
                "threadId": thread_id,
                "type": "metadata"
            }).encode() + b"\n"
            
            # Get response from the agent
            response = await agent_system.get_response(
                messages=request.message,
                thread=active_threads.get(thread_id)
            )
            
            if response:
                # Store the thread for future interactions
                active_threads[thread_id] = response.thread
                
                # Stream the response content in chunks
                # Convert the content to string if it's a ChatMessageContent object
                content = str(response.content)
                words = content.split()
                
                full_response = ""
                for i in range(0, len(words), 3):  # Send 3 words at a time
                    chunk = " ".join(words[i:i+3])
                    full_response += chunk + " "
                    
                    yield json.dumps({
                        "content": full_response.strip(),
                        "type": "content"
                    }).encode() + b"\n"
                    
                    await asyncio.sleep(0.05)  # Add a slight delay between chunks
                
                # Signal completion
                yield json.dumps({
                    "type": "done"
                }).encode() + b"\n"
            else:
                yield json.dumps({
                    "error": "Failed to get response from agent",
                    "type": "error"
                }).encode() + b"\n"
                
        except Exception as e:
            logger.error(f"Error in stream_message: {str(e)}")
            yield json.dumps({
                "error": str(e),
                "type": "error"
            }).encode() + b"\n"
    
    return StreamingResponse(
        generate(),
        media_type="application/json"
    )

# Delete a thread
@app.delete("/api/agent")
async def delete_thread(threadId: str):
    try:
        if threadId in active_threads:
            del active_threads[threadId]
            return {"success": True}
        else:
            raise HTTPException(status_code=404, detail="Thread not found")
    except Exception as e:
        logger.error(f"Error in delete_thread: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    port = int(os.getenv("AGENT_SERVICE_PORT", "8000"))
    
    logger.info(f"Starting Pizza Agent API server on port {port}")
    
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=port) 