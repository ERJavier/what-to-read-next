"""
WhatToRead API - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="WhatToRead API",
    description="Semantic book recommendation engine API",
    version="0.1.0"
)

# CORS middleware (configure as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "whattoread-api"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "WhatToRead API",
        "version": "0.1.0",
        "docs": "/docs"
    }

