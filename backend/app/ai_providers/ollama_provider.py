"""Ollama local AI provider – REST API via httpx."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from app.ai_providers.base import AIProvider
from app.config import settings

logger = logging.getLogger(__name__)


class OllamaProvider(AIProvider):
    """Local Ollama provider using its REST API."""

    def __init__(self) -> None:
        self._base_url: str = settings.OLLAMA_BASE_URL.rstrip("/")
        self._default_model: str = settings.OLLAMA_CHAT_MODEL

    @property
    def name(self) -> str:
        return "ollama"

    async def available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                return resp.status_code == 200
        except Exception as exc:
            logger.debug("Ollama not available: %s", exc)
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "id": m["name"],
                        "name": m["name"],
                        "size": m.get("size"),
                        "modified_at": m.get("modified_at"),
                    }
                    for m in data.get("models", [])
                ]
        except Exception as exc:
            logger.error("Ollama list_models failed: %s", exc)
            return []

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str | AsyncIterator[str]:
        model = model or self._default_model
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
        }

        if stream:
            return self._stream_chat(payload)
        return await self._complete_chat(payload)

    # ── Internals ────────────────────────────────────────────

    async def _complete_chat(self, payload: Dict[str, Any]) -> str:
        payload["stream"] = False
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self._base_url}/api/chat",
                json=payload,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama error ({resp.status_code}): {resp.text}")
            data = resp.json()
            return data.get("message", {}).get("content", "")

    async def _stream_chat(self, payload: Dict[str, Any]) -> AsyncIterator[str]:
        payload["stream"] = True
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/api/chat",
                json=payload,
            ) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    raise RuntimeError(f"Ollama error ({resp.status_code}): {body.decode()}")
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
