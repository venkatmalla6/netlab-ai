"""Lab Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.device import DeviceResponse


class LabCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class LabUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None


class LabResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    eve_ng_lab_id: Optional[str] = None
    topology_data: Optional[str] = None
    device_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class LabDetailResponse(LabResponse):
    devices: List[DeviceResponse] = []
