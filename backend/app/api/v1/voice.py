"""Voice endpoints – Speech-to-Text and Text-to-Speech."""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.ai_providers.stt_provider import stt_provider
from app.ai_providers.tts_provider import tts_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en_US-lessac-medium"


class TTSResponse(BaseModel):
    success: bool
    audio_format: str
    audio_base64: Optional[str] = None
    message: Optional[str] = None


class STTResponse(BaseModel):
    success: bool
    text: str
    language: Optional[str] = "en"


@router.get("/status")
async def voice_status():
    """Check availability of STT (Whisper) and TTS (Piper) engines."""
    stt_avail = await stt_provider.available()
    tts_avail = await tts_provider.available()
    return {
        "stt": {"provider": "faster-whisper", "available": stt_avail},
        "tts": {"provider": "piper", "available": tts_avail},
    }


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe an audio file using faster-whisper."""
    try:
        content = await file.read()
        transcription = await stt_provider.transcribe(content)
        return STTResponse(success=True, text=transcription)
    except Exception as e:
        logger.error("STT error: %s", e)
        raise HTTPException(status_code=500, detail=f"Speech recognition error: {e}")


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """Synthesize speech from text using Piper TTS."""
    try:
        audio_b64 = await tts_provider.synthesize(request.text, voice=request.voice)
        return TTSResponse(
            success=True,
            audio_format="wav",
            audio_base64=audio_b64,
            message="Speech generated successfully",
        )
    except Exception as e:
        logger.error("TTS error: %s", e)
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {e}")

