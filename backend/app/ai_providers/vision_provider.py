"""Vision AI provider – delegates to Ollama vision model or Groq."""

from __future__ import annotations

import base64
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.ai_providers.base import AIProvider
from app.config import settings

logger = logging.getLogger(__name__)


class VisionProvider(AIProvider):
    """Handles image-based AI queries via Groq Vision API or Ollama vision models."""

    def __init__(self) -> None:
        self._groq_api_key: str = settings.GROQ_API_KEY or ""
        self._groq_base_url: str = settings.GROQ_BASE_URL.rstrip("/")
        self._groq_model: str = settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        self._ollama_base_url: str = settings.OLLAMA_BASE_URL.rstrip("/")
        self._ollama_model: str = settings.OLLAMA_VISION_MODEL

    @property
    def name(self) -> str:
        return "vision"

    async def available(self) -> bool:
        if self._groq_api_key:
            return True
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self._ollama_base_url}/api/tags")
                if resp.status_code == 200:
                    models = [m["name"] for m in resp.json().get("models", [])]
                    return any(self._ollama_model in m for m in models)
        except Exception:
            pass
        return False

    async def list_models(self) -> List[Dict[str, Any]]:
        models = []
        if self._groq_api_key:
            models.append({"id": self._groq_model, "name": f"Groq {self._groq_model}", "type": "vision"})
        models.append({"id": self._ollama_model, "name": f"Ollama {self._ollama_model}", "type": "vision"})
        return models

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str:
        # 1. Try Groq Vision first if API key is configured
        if self._groq_api_key:
            try:
                target_model = model or self._groq_model
                headers = {
                    "Authorization": f"Bearer {self._groq_api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "NETLAB-AI/1.0",
                }
                payload = {
                    "model": target_model,
                    "messages": messages,
                    "temperature": kwargs.get("temperature", 0.1),
                }
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        f"{self._groq_base_url}/chat/completions",
                        json=payload,
                        headers=headers,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        logger.warning("Groq Vision API returned %s: %s", resp.status_code, resp.text)
            except Exception as exc:
                logger.warning("Groq Vision failed, checking Ollama fallback: %s", exc)

        # 2. Try Ollama local vision fallback
        try:
            ollama_messages = []
            for msg in messages:
                content = msg.get("content")
                if isinstance(content, list):
                    text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
                    img_parts = [
                        p.get("image_url", {}).get("url", "").split("base64,")[-1]
                        for p in content
                        if p.get("type") == "image_url"
                    ]
                    ollama_messages.append({
                        "role": msg.get("role", "user"),
                        "content": " ".join(text_parts),
                        "images": [img for img in img_parts if img],
                    })
                else:
                    ollama_messages.append(msg)

            payload_ollama: Dict[str, Any] = {
                "model": self._ollama_model,
                "messages": ollama_messages,
                "stream": False,
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self._ollama_base_url}/api/chat", json=payload_ollama)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("message", {}).get("content", "")
        except Exception as exc:
            logger.error("Ollama Vision also failed: %s", exc)

        raise RuntimeError("No vision provider available (Groq and Ollama both unreachable)")

    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str = "Analyze this network diagram and extract all devices and links.",
        mime_type: str = "image/png",
    ) -> str:
        """Convenience method: encode image and query vision model."""
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                    },
                ],
            }
        ]
        return await self.chat(messages)  # type: ignore[return-value]
