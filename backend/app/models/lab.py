"""SQLAlchemy ORM models – Lab and related entities."""

from __future__ import annotations

import datetime
import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.device import Device


class LabStatus(str, enum.Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"


class Lab(Base):
    __tablename__ = "labs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[LabStatus] = mapped_column(
        Enum(LabStatus), default=LabStatus.STOPPED, nullable=False
    )
    eve_ng_lab_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    topology_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    devices: Mapped[List["Device"]] = relationship(
        "Device", back_populates="lab", cascade="all, delete-orphan", lazy="selectin"
    )
    connections: Mapped[List["Connection"]] = relationship(
        "Connection", back_populates="lab", cascade="all, delete-orphan", lazy="selectin"
    )


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lab_id: Mapped[int] = mapped_column(ForeignKey("labs.id", ondelete="CASCADE"), nullable=False)
    source_device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    source_interface_id: Mapped[int] = mapped_column(ForeignKey("interfaces.id", ondelete="CASCADE"), nullable=False)
    target_device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    target_interface_id: Mapped[int] = mapped_column(ForeignKey("interfaces.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    lab: Mapped["Lab"] = relationship("Lab", back_populates="connections")
    source_device: Mapped["Device"] = relationship("Device", foreign_keys=[source_device_id])
    source_interface: Mapped["Interface"] = relationship("Interface", foreign_keys=[source_interface_id])
    target_device: Mapped["Device"] = relationship("Device", foreign_keys=[target_device_id])
    target_interface: Mapped["Interface"] = relationship("Interface", foreign_keys=[target_interface_id])


# Forward import to resolve circular reference
from app.models.device import Interface  # noqa: E402, F811
