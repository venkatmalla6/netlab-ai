"""TTS provider – Piper TTS (stub-ready; requires piper-tts installed)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.ai_providers.base import AIProvider

logger = logging.getLogger(__name__)


class TTSProvider(AIProvider):
    """Text-to-speech using Piper TTS (local CPU inference)."""

    @property
    def name(self) -> str:
        return "tts"

    async def available(self) -> bool:
        try:
            import piper  # noqa: F401
            return True
        except ImportError:
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "en_US-lessac-medium", "name": "Lessac Medium", "type": "tts"},
            {"id": "en_US-amy-medium", "name": "Amy Medium", "type": "tts"},
        ]

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str:
        raise NotImplementedError("Use synthesize() for TTS.")

    async def synthesize(self, text: str, output_path: str, model_name: str = "en_US-lessac-medium") -> str:
        """Synthesize text to an audio file. Returns the output path."""
        try:
            import piper  # noqa: F401
        except ImportError:
            raise RuntimeError("piper-tts is not installed. Run: pip install piper-tts")

        # Piper synthesis would go here with the installed model
        logger.info("TTS synthesis requested: %d chars -> %s", len(text), output_path)
        raise RuntimeError("Piper TTS model not installed. Download a model first.")


tts_provider = TTSProvider()
