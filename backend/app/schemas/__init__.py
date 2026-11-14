"""Schemas package."""

from app.schemas.ai import (
    AIModelInfo,
    ChatCompletionResponse,
    ChatMessageResponse,
    ChatRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    ConversationMessagesResponse,
)
from app.schemas.common import ErrorResponse, HealthResponse, MessageResponse, PaginatedResponse, StatusCheck
from app.schemas.configuration import ConfigurationCreate, ConfigurationResponse
from app.schemas.dashboard import DashboardResponse, DashboardStats, RecentActivity
from app.schemas.device import (
    DeviceCreate,
    DeviceDetailResponse,
    DeviceResponse,
    DeviceUpdate,
    InterfaceCreate,
    InterfaceResponse,
)
from app.schemas.lab import LabCreate, LabDetailResponse, LabResponse, LabUpdate
from app.schemas.topology import TopologyCreate, TopologyResponse, TopologyUpdate

__all__ = [
    "AIModelInfo",
    "ChatCompletionResponse",
    "ChatMessageResponse",
    "ChatRequest",
    "ChatSessionListResponse",
    "ChatSessionResponse",
    "ConfigurationCreate",
    "ConfigurationResponse",
    "ConversationMessagesResponse",
    "DashboardResponse",
    "DashboardStats",
    "DeviceCreate",
    "DeviceDetailResponse",
    "DeviceResponse",
    "DeviceUpdate",
    "ErrorResponse",
    "HealthResponse",
    "InterfaceCreate",
    "InterfaceResponse",
    "LabCreate",
    "LabDetailResponse",
    "LabResponse",
    "LabUpdate",
    "MessageResponse",
    "PaginatedResponse",
    "RecentActivity",
    "StatusCheck",
    "TopologyCreate",
    "TopologyResponse",
    "TopologyUpdate",
]
