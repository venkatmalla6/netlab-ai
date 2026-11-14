"""AI provider manager – selects, caches, and falls back between providers."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Dict, List, Optional

from app.ai_providers.base import AIProvider
from app.ai_providers.groq_provider import GroqProvider
from app.ai_providers.ollama_provider import OllamaProvider
from app.ai_providers.vision_provider import VisionProvider

logger = logging.getLogger(__name__)


class AIProviderManager:
    """Manages multiple AI providers with automatic fallback.

    Selection order (mode):
        • ``"cloud"``  → Groq only
        • ``"local"``  → Ollama only
        • ``"auto"``   → try Groq first, fall back to Ollama
    """

    def __init__(self) -> None:
        self._groq = GroqProvider()
        self._ollama = OllamaProvider()
        self._vision = VisionProvider()
        self._providers: Dict[str, AIProvider] = {
            "groq": self._groq,
            "ollama": self._ollama,
            "vision": self._vision,
        }

    # ── Public helpers ───────────────────────────────────────

    def get_provider(self, name: str) -> Optional[AIProvider]:
        return self._providers.get(name)

    async def select_provider(self, preferred: str = "auto") -> AIProvider:
        """Return the best available provider based on *preferred* mode."""
        if preferred == "groq":
            if await self._groq.available():
                return self._groq
            raise RuntimeError("Groq provider is not available. Check your API key and network.")

        if preferred == "ollama":
            if await self._ollama.available():
                return self._ollama
            raise RuntimeError("Ollama is not running. Start it with `ollama serve`.")

        # auto: try cloud first, then local
        if await self._groq.available():
            return self._groq
        logger.info("Groq unavailable, falling back to Ollama")
        if await self._ollama.available():
            return self._ollama

        raise RuntimeError(
            "No AI provider is available. "
            "Configure GROQ_API_KEY for cloud AI, or start Ollama for local AI."
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        provider: str = "auto",
        **kwargs: Any,
    ) -> str | AsyncIterator[str]:
        """High-level chat that auto-selects a provider."""
        selected = await self.select_provider(provider)
        logger.info("Using AI provider: %s", selected.name)
        return await selected.chat(messages, model=model, stream=stream, **kwargs)

    async def status(self) -> List[Dict[str, Any]]:
        """Return availability status for every registered provider."""
        results: List[Dict[str, Any]] = []
        for name, prov in self._providers.items():
            try:
                is_avail = await prov.available()
                results.append({"name": name, "available": is_avail})
            except Exception as exc:
                results.append({"name": name, "available": False, "error": str(exc)})
        return results

    async def list_all_models(self) -> List[Dict[str, Any]]:
        """Aggregate models from all available providers."""
        all_models: List[Dict[str, Any]] = []
        for name, prov in self._providers.items():
            try:
                if await prov.available():
                    models = await prov.list_models()
                    for m in models:
                        m["provider"] = name
                    all_models.extend(models)
            except Exception:
                continue
        return all_models


# Singleton
ai_manager = AIProviderManager()
