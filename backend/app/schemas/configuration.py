"""Configuration Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConfigurationCreate(BaseModel):
    device_id: int
    config_text: str = Field(..., min_length=1)
    description: Optional[str] = None
    created_by: Optional[str] = "system"


class ConfigurationResponse(BaseModel):
    id: int
    device_id: int
    config_text: str
    version: int
    description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
