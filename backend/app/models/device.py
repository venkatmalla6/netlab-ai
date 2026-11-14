"""SQLAlchemy ORM models – Device and Interface."""

from __future__ import annotations

import datetime
import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.lab import Lab


class DeviceType(str, enum.Enum):
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    SERVER = "server"
    WORKSTATION = "workstation"
    CLOUD = "cloud"
    OTHER = "other"


class DeviceVendor(str, enum.Enum):
    CISCO = "cisco"
    JUNIPER = "juniper"
    ARISTA = "arista"
    LINUX = "linux"
    WINDOWS = "windows"
    OTHER = "other"


class DeviceStatus(str, enum.Enum):
    STOPPED = "stopped"
    BOOTING = "booting"
    RUNNING = "running"
    SHUTTING_DOWN = "shutting_down"
    ERROR = "error"
    UNREACHABLE = "unreachable"


class InterfaceStatus(str, enum.Enum):
    UP = "up"
    DOWN = "down"
    ADMIN_DOWN = "admin_down"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lab_id: Mapped[int] = mapped_column(ForeignKey("labs.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    device_type: Mapped[DeviceType] = mapped_column(Enum(DeviceType), default=DeviceType.ROUTER, nullable=False)
    vendor: Mapped[DeviceVendor] = mapped_column(Enum(DeviceVendor), default=DeviceVendor.CISCO, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[DeviceStatus] = mapped_column(Enum(DeviceStatus), default=DeviceStatus.STOPPED, nullable=False)
    management_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    management_port: Mapped[Optional[int]] = mapped_column(nullable=True)
    console_port: Mapped[Optional[int]] = mapped_column(nullable=True)
    x_position: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    y_position: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    eve_ng_node_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    lab: Mapped["Lab"] = relationship("Lab", back_populates="devices")
    interfaces: Mapped[List["Interface"]] = relationship(
        "Interface", back_populates="device", cascade="all, delete-orphan", lazy="selectin"
    )
    configurations: Mapped[List["Configuration"]] = relationship(
        "Configuration", back_populates="device", cascade="all, delete-orphan", lazy="selectin"
    )


class Interface(Base):
    __tablename__ = "interfaces"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    subnet_mask: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    mac_address: Mapped[Optional[str]] = mapped_column(String(17), nullable=True)
    status: Mapped[InterfaceStatus] = mapped_column(Enum(InterfaceStatus), default=InterfaceStatus.DOWN, nullable=False)
    speed: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    duplex: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="interfaces")


# Import here to avoid circular
from app.models.configuration import Configuration  # noqa: E402, F811
