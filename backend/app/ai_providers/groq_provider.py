"""Groq AI provider – OpenAI-compatible REST API via httpx."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from app.ai_providers.base import AIProvider
from app.config import settings

logger = logging.getLogger(__name__)

# Fallback models on Groq if primary model hits rate limit (429) or token quotas
FALLBACK_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]


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

        # On Groq on-demand tier, expected tokens default to 2048 which exceeds the 1000 OTPM ceiling.
        # Cap max_tokens at 800 by default to prevent HTTP 429 rate limit exceeded.
        raw_max_tokens = kwargs.pop("max_tokens", 800)
        try:
            max_tokens = min(int(raw_max_tokens), 800)
        except (ValueError, TypeError):
            max_tokens = 800

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "max_tokens": max_tokens,
            "reasoning_effort": kwargs.pop("reasoning_effort", "low"),
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
        models_to_try = [payload.get("model", self._default_model)]
        for fb in FALLBACK_MODELS:
            if fb not in models_to_try:
                models_to_try.append(fb)

        last_err: Optional[Exception] = None
        for m in models_to_try:
            current_payload = dict(payload)
            current_payload["model"] = m
            # If falling back due to previous throttling, safe-clamp max_tokens
            if m != payload.get("model"):
                current_payload["max_tokens"] = min(int(current_payload.get("max_tokens", 500)), 500)

            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        f"{self._base_url}/chat/completions",
                        headers=self._headers(),
                        json=current_payload,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        msg = data["choices"][0]["message"]
                        content = (msg.get("content") or "").strip()
                        if content:
                            return content
                        return msg.get("reasoning") or ""

                    body = resp.text
                    logger.warning("Groq API model %s error %s: %s", m, resp.status_code, body)
                    # If 429 rate limit or token limit, try next fallback model
                    if resp.status_code in (429, 413) or "rate_limit" in body.lower() or "otpm" in body.lower():
                        last_err = RuntimeError(f"Groq API error ({resp.status_code}): {body}")
                        continue
                    else:
                        raise RuntimeError(f"Groq API error ({resp.status_code}): {body}")
            except Exception as exc:
                last_err = exc
                logger.warning("Groq attempt with model %s failed: %s", m, exc)
                continue

        if last_err:
            raise last_err
        raise RuntimeError("Groq completion failed with all available models")

    async def _stream_chat(self, payload: Dict[str, Any]) -> AsyncIterator[str]:
        models_to_try = [payload.get("model", self._default_model)]
        for fb in FALLBACK_MODELS:
            if fb not in models_to_try:
                models_to_try.append(fb)

        async with httpx.AsyncClient(timeout=120.0) as client:
            stream_started = False
            last_err: Optional[Exception] = None
            for m in models_to_try:
                current_payload = dict(payload)
                current_payload["model"] = m
                if m != payload.get("model"):
                    current_payload["max_tokens"] = min(int(current_payload.get("max_tokens", 500)), 500)

                try:
                    async with client.stream(
                        "POST",
                        f"{self._base_url}/chat/completions",
                        headers=self._headers(),
                        json=current_payload,
                    ) as resp:
                        if resp.status_code == 200:
                            async for line in resp.aiter_lines():
                                if not line.startswith("data: "):
                                    continue
                                data_str = line[6:]
                                if data_str.strip() == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    delta = chunk["choices"][0].get("delta", {})
                                    content = delta.get("content") or delta.get("reasoning")
                                    if content:
                                        stream_started = True
                                        yield content
                                except (json.JSONDecodeError, KeyError, IndexError):
                                    continue
                            return
                        else:
                            body = await resp.aread()
                            body_text = body.decode()
                            logger.warning("Groq stream model %s returned %s: %s", m, resp.status_code, body_text)
                            if resp.status_code in (429, 413) or "rate_limit" in body_text.lower() or "otpm" in body_text.lower():
                                last_err = RuntimeError(f"Groq API error ({resp.status_code}): {body_text}")
                                continue
                            raise RuntimeError(f"Groq API error ({resp.status_code}): {body_text}")
                except Exception as exc:
                    if stream_started:
                        # Already emitted chunks to client, don't restart stream midway
                        raise
                    last_err = exc
                    logger.warning("Groq stream attempt with %s failed: %s", m, exc)
                    continue

            if last_err:
                raise last_err
            raise RuntimeError("Groq stream completion failed with all available models")
