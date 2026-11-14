"""AI / Chat Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[int] = None
    model: Optional[str] = None
    provider: Optional[str] = None  # "groq" | "ollama" | "auto"
    stream: bool = True


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    tokens_used: Optional[int] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    model: Optional[str] = None
    provider: Optional[str] = None
    message_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class ChatSessionListResponse(BaseModel):
    sessions: List[ChatSessionResponse]
    total: int


class ConversationMessagesResponse(BaseModel):
    session: ChatSessionResponse
    messages: List[ChatMessageResponse]


class ChatCompletionResponse(BaseModel):
    """Non-streaming chat response."""
    message: str
    conversation_id: int
    model: Optional[str] = None
    provider: Optional[str] = None
    tokens_used: Optional[int] = None


class AIModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    context_length: Optional[int] = None
    available: bool = True
