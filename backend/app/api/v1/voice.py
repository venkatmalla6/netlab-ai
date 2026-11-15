"""Voice endpoints – Speech-to-Text, Voice Agent Turn, and Text-to-Speech."""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.ai_providers.stt_provider import stt_provider
from app.ai_providers.tts_provider import tts_provider
from app.services.ai_service import ai_service

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


class VoiceAgentTurnResponse(BaseModel):
    success: bool
    transcription: str
    reply: str
    conversation_id: Optional[int] = None


@router.get("/status")
async def voice_status():
    """Check availability of STT (Groq Whisper / faster-whisper) and TTS engines."""
    stt_avail = await stt_provider.available()
    tts_avail = await tts_provider.available()
    return {
        "stt": {"provider": "groq-whisper-turbo", "available": stt_avail},
        "tts": {"provider": "web-speech-api", "available": True},
    }


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe an audio file using Groq Whisper Large v3 Turbo or faster-whisper."""
    try:
        content = await file.read()
        filename = file.filename or "audio.webm"
        content_type = file.content_type or "audio/webm"
        transcription = await stt_provider.transcribe(
            content,
            filename=filename,
            content_type=content_type,
        )
        return STTResponse(success=True, text=transcription)
    except Exception as e:
        logger.error("STT error: %s", e)
        raise HTTPException(status_code=500, detail=f"Speech recognition error: {e}")


@router.post("/agent-turn", response_model=VoiceAgentTurnResponse)
async def voice_agent_turn(
    file: Optional[UploadFile] = File(None),
    text_prompt: Optional[str] = Form(None),
    conversation_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """End-to-end Voice Agent Turn: Audio in -> Whisper STT -> Copilot LLM -> Spoken Reply out."""
    transcribed_text = ""
    if file:
        try:
            content = await file.read()
            filename = file.filename or "audio.webm"
            content_type = file.content_type or "audio/webm"
            transcribed_text = await stt_provider.transcribe(
                content,
                filename=filename,
                content_type=content_type,
            )
        except Exception as e:
            logger.error("Voice agent STT error: %s", e)
            raise HTTPException(status_code=500, detail=f"Voice recognition failed: {e}")
    elif text_prompt:
        transcribed_text = text_prompt.strip()

    if not transcribed_text:
        raise HTTPException(status_code=400, detail="No speech or text provided.")

    try:
        chat_res = await ai_service.chat(
            db=db,
            message=transcribed_text,
            conversation_id=conversation_id,
            stream=False,
        )
        reply = chat_res.get("message", "")
        conv_id = chat_res.get("conversation_id", conversation_id)
        return VoiceAgentTurnResponse(
            success=True,
            transcription=transcribed_text,
            reply=reply,
            conversation_id=conv_id,
        )
    except Exception as e:
        logger.error("Voice agent turn error: %s", e)
        raise HTTPException(status_code=502, detail=f"AI Copilot failed: {e}")


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """Synthesize speech status check."""
    return TTSResponse(
        success=True,
        audio_format="browser-tts",
        message="Web Speech API active for high-fidelity client playback",
    )
