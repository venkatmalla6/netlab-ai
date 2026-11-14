"""Topology Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TopologyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    topology_json: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None


class TopologyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    topology_json: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None


class TopologyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    topology_json: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
