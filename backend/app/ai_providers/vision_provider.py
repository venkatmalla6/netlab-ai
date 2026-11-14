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
    """Handles image-based AI queries via Ollama vision models."""

    def __init__(self) -> None:
        self._base_url: str = settings.OLLAMA_BASE_URL.rstrip("/")
        self._default_model: str = settings.OLLAMA_VISION_MODEL

    @property
    def name(self) -> str:
        return "vision"

    async def available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                if resp.status_code != 200:
                    return False
                models = [m["name"] for m in resp.json().get("models", [])]
                return any(self._default_model in m for m in models)
        except Exception:
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        return [{"id": self._default_model, "name": self._default_model, "type": "vision"}]

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str:
        model = model or self._default_model
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{self._base_url}/api/chat", json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Vision provider error ({resp.status_code}): {resp.text}")
            data = resp.json()
            return data.get("message", {}).get("content", "")

    async def analyze_image(self, image_bytes: bytes, prompt: str = "Describe this network diagram.") -> str:
        """Convenience method: encode image and send to vision model."""
        b64 = base64.b64encode(image_bytes).decode()
        messages = [
            {
                "role": "user",
                "content": prompt,
                "images": [b64],
            }
        ]
        return await self.chat(messages)  # type: ignore[return-value]
