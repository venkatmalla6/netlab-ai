"""AI chat endpoints – POST /chat, GET /conversations, etc."""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_db
from app.schemas.ai import (
    ChatCompletionResponse,
    ChatMessageResponse,
    ChatRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    ConversationMessagesResponse,
)
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Chat"])


@router.post("/chat", response_model=None)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Send a chat message. If ``stream=true`` (default), returns SSE stream."""
    try:
        if request.stream:

            async def event_generator():
                session_id: Optional[int] = None
                try:
                    result = await ai_service.chat(
                        db=db,
                        message=request.message,
                        conversation_id=request.conversation_id,
                        model=request.model,
                        provider=request.provider or "auto",
                        stream=True,
                    )
                    # result is an async iterator
                    async for chunk in result:
                        yield {"event": "message", "data": json.dumps({"content": chunk})}
                    yield {"event": "done", "data": json.dumps({"status": "complete"})}
                except Exception as exc:
                    logger.error("Streaming error: %s", exc)
                    yield {
                        "event": "error",
                        "data": json.dumps({"error": str(exc)}),
                    }

            return EventSourceResponse(event_generator())

        # Non-streaming
        result = await ai_service.chat(
            db=db,
            message=request.message,
            conversation_id=request.conversation_id,
            model=request.model,
            provider=request.provider or "auto",
            stream=False,
        )
        return ChatCompletionResponse(
            message=result["message"],
            conversation_id=result["conversation_id"],
            model=result.get("model"),
            provider=result.get("provider"),
        )
    except Exception as exc:
        logger.error("Chat error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/conversations", response_model=ChatSessionListResponse)
async def list_conversations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List chat sessions ordered by most recent."""
    sessions = await ai_service.get_conversations(db, limit=limit, offset=offset)
    total = await ai_service.get_conversation_count(db)
    return ChatSessionListResponse(
        sessions=[
            ChatSessionResponse(
                id=s.id,
                title=s.title,
                model=s.model,
                provider=s.provider,
                message_count=len(s.messages),
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in sessions
        ],
        total=total,
    )


@router.get("/conversations/{session_id}", response_model=ConversationMessagesResponse)
async def get_conversation(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single conversation with all messages."""
    session = await ai_service.get_conversation_messages(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationMessagesResponse(
        session=ChatSessionResponse(
            id=session.id,
            title=session.title,
            model=session.model,
            provider=session.provider,
            message_count=len(session.messages),
            created_at=session.created_at,
            updated_at=session.updated_at,
        ),
        messages=[
            ChatMessageResponse(
                id=m.id,
                session_id=m.session_id,
                role=m.role.value,
                content=m.content,
                tokens_used=m.tokens_used,
                created_at=m.created_at,
            )
            for m in session.messages
        ],
    )


@router.delete("/conversations/{session_id}")
async def delete_conversation(session_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a conversation and all its messages."""
    deleted = await ai_service.delete_conversation(db, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted", "success": True}
