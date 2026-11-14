"""STT provider – faster-whisper (stub-ready; requires faster-whisper installed)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.ai_providers.base import AIProvider

logger = logging.getLogger(__name__)


class STTProvider(AIProvider):
    """Speech-to-text using faster-whisper (local CPU inference)."""

    @property
    def name(self) -> str:
        return "stt"

    async def available(self) -> bool:
        try:
            import faster_whisper  # noqa: F401
            return True
        except ImportError:
            from app.config import settings
            return bool(settings.GROQ_API_KEY)

    async def list_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "whisper-large-v3-turbo", "name": "Groq Whisper Large v3 Turbo", "type": "stt"},
            {"id": "base", "name": "Local Whisper Base", "type": "stt"},
        ]

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str:
        raise NotImplementedError("Use transcribe() for STT.")

    async def transcribe(self, audio_data: bytes | str, model_size: str = "whisper-large-v3-turbo") -> str:
        """Transcribe audio to text via local faster-whisper or Groq Whisper API."""
        try:
            from faster_whisper import WhisperModel
            if isinstance(audio_data, str):
                whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
                segments, _info = whisper_model.transcribe(audio_data, beam_size=5)
                return " ".join(seg.text for seg in segments)
        except Exception as exc:
            logger.info("Local faster-whisper not active (%s), using Groq Whisper fallback.", exc)

        # Fallback to Groq Whisper API
        from app.config import settings
        import httpx
        if not settings.GROQ_API_KEY:
            raise RuntimeError("No STT engine available. Install faster-whisper or configure GROQ_API_KEY.")

        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
        content = audio_data if isinstance(audio_data, bytes) else open(audio_data, "rb").read()
        files = {"file": ("audio.wav", content, "audio/wav")}
        data = {"model": "whisper-large-v3-turbo"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.GROQ_BASE_URL.rstrip('/')}/audio/transcriptions",
                headers=headers,
                files=files,
                data=data,
            )
            if resp.status_code == 200:
                return resp.json().get("text", "")
            raise RuntimeError(f"Groq Whisper error ({resp.status_code}): {resp.text}")


stt_provider = STTProvider()
