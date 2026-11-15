"""STT provider – Groq Whisper Large v3 Turbo & faster-whisper."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.ai_providers.base import AIProvider

logger = logging.getLogger(__name__)


class STTProvider(AIProvider):
    """Speech-to-text using Groq Whisper API or local faster-whisper."""

    @property
    def name(self) -> str:
        return "stt"

    async def available(self) -> bool:
        from app.config import settings
        if settings.GROQ_API_KEY:
            return True
        try:
            import faster_whisper  # noqa: F401
            return True
        except ImportError:
            return False

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

    async def transcribe(
        self,
        audio_data: bytes | str,
        filename: str = "audio.wav",
        content_type: str = "audio/wav",
        language: str = "en",
        model_size: str = "whisper-large-v3-turbo",
    ) -> str:
        """Transcribe audio to text via Groq Whisper API (primary) or local faster-whisper."""
        from app.config import settings
        import httpx

        # 1. Primary: Groq Whisper Large v3 Turbo (ultra-fast cloud STT)
        if settings.GROQ_API_KEY:
            try:
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                content = audio_data if isinstance(audio_data, bytes) else open(audio_data, "rb").read()

                # Infer proper file name and content type
                ext = ".wav"
                if "wav" in content_type or filename.endswith(".wav"):
                    ext = ".wav"
                    content_type = "audio/wav"
                elif "webm" in content_type or filename.endswith(".webm"):
                    ext = ".webm"
                    content_type = "audio/webm"
                elif "mp3" in content_type or filename.endswith(".mp3"):
                    ext = ".mp3"
                    content_type = "audio/mp3"
                elif "m4a" in content_type or filename.endswith(".m4a"):
                    ext = ".m4a"
                    content_type = "audio/m4a"
                elif "ogg" in content_type or filename.endswith(".ogg"):
                    ext = ".ogg"
                    content_type = "audio/ogg"
                else:
                    content_type = "audio/wav"

                upload_name = f"audio{ext}"

                files = {"file": (upload_name, content, content_type)}
                data = {
                    "model": "whisper-large-v3-turbo",
                    "language": language or "en",
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        f"{settings.GROQ_BASE_URL.rstrip('/')}/audio/transcriptions",
                        headers=headers,
                        files=files,
                        data=data,
                    )
                    if resp.status_code == 200:
                        return resp.json().get("text", "").strip()
                    logger.warning("Groq Whisper API returned %s: %s", resp.status_code, resp.text)
            except Exception as exc:
                logger.warning("Groq Whisper STT failed, trying local fallback: %s", exc)

        # 2. Fallback: local faster-whisper if available
        try:
            from faster_whisper import WhisperModel
            if isinstance(audio_data, str):
                whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
                segments, _info = whisper_model.transcribe(audio_data, beam_size=5, language=language or "en")
                return " ".join(seg.text for seg in segments).strip()
        except Exception as exc:
            logger.info("Local faster-whisper fallback failed: %s", exc)

        raise RuntimeError("Speech-to-text failed. Check your GROQ_API_KEY or microphone recording.")


stt_provider = STTProvider()
