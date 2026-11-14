"""Device & Interface Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class InterfaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    mac_address: Optional[str] = None
    status: str = "down"
    speed: Optional[str] = None
    duplex: Optional[str] = None
    description: Optional[str] = None


class InterfaceResponse(BaseModel):
    id: int
    device_id: int
    name: str
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    mac_address: Optional[str] = None
    status: str
    speed: Optional[str] = None
    duplex: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


class DeviceCreate(BaseModel):
    lab_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=255)
    device_type: str = "router"
    vendor: str = "cisco"
    platform: Optional[str] = None
    management_ip: Optional[str] = None
    management_port: Optional[int] = 22
    console_port: Optional[int] = 30001
    x_position: Optional[float] = 0.0
    y_position: Optional[float] = 0.0
    config: Optional[str] = None


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    device_type: Optional[str] = None
    vendor: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    management_ip: Optional[str] = None
    management_port: Optional[int] = None
    console_port: Optional[int] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    config: Optional[str] = None


class DeviceResponse(BaseModel):
    id: int
    lab_id: int
    name: str
    device_type: str
    vendor: str
    platform: Optional[str] = None
    status: str
    management_ip: Optional[str] = None
    management_port: Optional[int] = None
    console_port: Optional[int] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    interface_count: int = 0
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


class DeviceDetailResponse(DeviceResponse):
    config: Optional[str] = None
    interfaces: List[InterfaceResponse] = []
