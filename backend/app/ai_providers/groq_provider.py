"""Groq AI provider – OpenAI-compatible REST API via httpx."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from app.ai_providers.base import AIProvider
from app.config import settings

logger = logging.getLogger(__name__)


class GroqProvider(AIProvider):
    """Groq cloud provider using the OpenAI-compatible chat completions API."""

    def __init__(self) -> None:
        self._api_key: str = settings.GROQ_API_KEY or ""
        self._base_url: str = settings.GROQ_BASE_URL.rstrip("/")
        self._default_model: str = settings.GROQ_MODEL

    # ── AIProvider interface ─────────────────────────────────

    @property
    def name(self) -> str:
        return "groq"

    async def available(self) -> bool:
        """Check if the Groq API key is set and the endpoint is reachable."""
        if not self._api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self._base_url}/models",
                    headers=self._headers(),
                )
                return resp.status_code == 200
        except Exception as exc:
            logger.warning("Groq availability check failed: %s", exc)
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        if not self._api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self._base_url}/models",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "id": m["id"],
                        "name": m.get("id", ""),
                        "owned_by": m.get("owned_by", "groq"),
                        "context_length": m.get("context_window"),
                    }
                    for m in data.get("data", [])
                ]
        except Exception as exc:
            logger.error("Groq list_models failed: %s", exc)
            return []

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str | AsyncIterator[str]:
        model = model or self._default_model
        if not self._api_key:
            raise RuntimeError(
                "Groq API key is not configured. "
                "Set GROQ_API_KEY in your .env file to use the Groq provider."
            )

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
            **kwargs,
        }

        if stream:
            return self._stream_chat(payload)
        return await self._complete_chat(payload)

    # ── Internal helpers ─────────────────────────────────────

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def _complete_chat(self, payload: Dict[str, Any]) -> str:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self._base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            if resp.status_code != 200:
                body = resp.text
                logger.error("Groq API error %s: %s", resp.status_code, body)
                raise RuntimeError(f"Groq API error ({resp.status_code}): {body}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def _stream_chat(self, payload: Dict[str, Any]) -> AsyncIterator[str]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    raise RuntimeError(f"Groq API error ({resp.status_code}): {body.decode()}")
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
