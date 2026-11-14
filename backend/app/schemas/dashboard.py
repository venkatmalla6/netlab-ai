"""Dashboard Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import List, Optional

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_labs: int = 0
    running_labs: int = 0
    total_devices: int = 0
    running_devices: int = 0
    total_topologies: int = 0
    total_configurations: int = 0
    total_chat_sessions: int = 0
    total_chat_messages: int = 0


class RecentActivity(BaseModel):
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_activity: List[RecentActivity] = []
