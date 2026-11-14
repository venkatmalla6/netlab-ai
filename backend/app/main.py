"""NETLAB AI – FastAPI Application Entry Point."""

from __future__ import annotations

import os
# Ensure pure Python execution to prevent Windows AppLocker policy blocks on cython modules
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.config import settings
from app.core.database import init_db, async_session_factory
from app.core.seed import seed_initial_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("netlab_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler – initializes database tables and seeds baseline topologies on startup."""
    logger.info("Initializing NETLAB AI database...")
    try:
        await init_db()
        logger.info("Database tables verified/created successfully.")
        async with async_session_factory() as session:
            await seed_initial_data(session)
    except Exception as exc:
        logger.error("Failed to initialize database: %s", exc)
    yield
    logger.info("NETLAB AI shutting down...")


app = FastAPI(
    title="NETLAB AI – Network Automation & Academy API",
    description="Backend services for AI network engineering, topology design, EVE-NG automation, and CCNA/CCNP academy.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": "NETLAB AI",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "api_v1": "/api/v1",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "database": "sqlite (aiosqlite)",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "ollama_url": settings.OLLAMA_BASE_URL,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
