"""Application settings endpoints."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.ai_providers.manager import ai_manager
from app.config import settings
from app.integrations.eve_ng.client import eve_ng_client
from app.integrations.vmware.client import vmware_client
from app.schemas.common import StatusCheck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


class AppSettings(BaseModel):
    """Publicly-visible settings (no secrets)."""
    app_env: str
    groq_model: str
    ollama_base_url: str
    ollama_chat_model: str
    ollama_vision_model: str
    ollama_embedding_model: str
    eve_host: Optional[str] = None
    vmware_host: Optional[str] = None
    groq_configured: bool = False


class AppSettingsUpdate(BaseModel):
    groq_model: Optional[str] = None
    ollama_chat_model: Optional[str] = None
    ollama_vision_model: Optional[str] = None
    ollama_embedding_model: Optional[str] = None


@router.get("", response_model=AppSettings)
async def get_settings():
    """Return current (non-secret) settings."""
    return AppSettings(
        app_env=settings.APP_ENV,
        groq_model=settings.GROQ_MODEL,
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_chat_model=settings.OLLAMA_CHAT_MODEL,
        ollama_vision_model=settings.OLLAMA_VISION_MODEL,
        ollama_embedding_model=settings.OLLAMA_EMBEDDING_MODEL,
        eve_host=settings.EVE_HOST,
        vmware_host=settings.VMWARE_HOST,
        groq_configured=bool(settings.GROQ_API_KEY),
    )


@router.put("", response_model=AppSettings)
async def update_settings(update: AppSettingsUpdate):
    """Update runtime settings (non-secret, in-memory only)."""
    if update.groq_model is not None:
        settings.GROQ_MODEL = update.groq_model
    if update.ollama_chat_model is not None:
        settings.OLLAMA_CHAT_MODEL = update.ollama_chat_model
    if update.ollama_vision_model is not None:
        settings.OLLAMA_VISION_MODEL = update.ollama_vision_model
    if update.ollama_embedding_model is not None:
        settings.OLLAMA_EMBEDDING_MODEL = update.ollama_embedding_model
    return await get_settings()


@router.get("/status")
async def check_status() -> Dict[str, Any]:
    """Check connectivity to all external services."""
    checks: list[Dict[str, Any]] = []

    # Groq
    groq_available = False
    try:
        prov = ai_manager.get_provider("groq")
        if prov:
            groq_available = await prov.available()
    except Exception as exc:
        logger.warning("Groq status check: %s", exc)
    checks.append(StatusCheck(
        name="Groq Cloud AI",
        status="connected" if groq_available else "disconnected",
        details="API key configured" if settings.GROQ_API_KEY else "No API key",
    ).model_dump())

    # Ollama
    ollama_available = False
    try:
        prov = ai_manager.get_provider("ollama")
        if prov:
            ollama_available = await prov.available()
    except Exception:
        pass
    checks.append(StatusCheck(
        name="Ollama Local AI",
        status="connected" if ollama_available else "disconnected",
        details=settings.OLLAMA_BASE_URL,
    ).model_dump())

    # EVE-NG
    eve_available = await eve_ng_client.available()
    checks.append(StatusCheck(
        name="EVE-NG",
        status="connected" if eve_available else "disconnected",
        details=settings.EVE_HOST or "Not configured",
    ).model_dump())

    # VMware
    vmware_available = await vmware_client.available()
    checks.append(StatusCheck(
        name="VMware",
        status="connected" if vmware_available else "disconnected",
        details=settings.VMWARE_HOST or "Not configured",
    ).model_dump())

    return {"services": checks}
