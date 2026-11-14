"""Common Pydantic schemas used across the application."""

from __future__ import annotations

import datetime
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    detail: str
    status_code: int = 500
    errors: Optional[Any] = None


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1


class StatusCheck(BaseModel):
    name: str
    status: str  # "connected" | "disconnected" | "error"
    details: Optional[str] = None
    latency_ms: Optional[float] = None
