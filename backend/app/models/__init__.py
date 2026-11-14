"""Models package – import all models so Alembic picks them up."""

from app.models.audit import AuditLog
from app.models.chat import ChatMessage, ChatRole, ChatSession
from app.models.configuration import Configuration
from app.models.device import Device, DeviceStatus, DeviceType, DeviceVendor, Interface, InterfaceStatus
from app.models.lab import Connection, Lab, LabStatus
from app.models.learning import DifficultyLevel, LearningLesson, LearningModule
from app.models.monitoring import MonitoringSnapshot
from app.models.topology import Topology

__all__ = [
    "AuditLog",
    "ChatMessage",
    "ChatRole",
    "ChatSession",
    "Configuration",
    "Connection",
    "Device",
    "DeviceStatus",
    "DeviceType",
    "DeviceVendor",
    "DifficultyLevel",
    "Interface",
    "InterfaceStatus",
    "Lab",
    "LabStatus",
    "LearningLesson",
    "LearningModule",
    "MonitoringSnapshot",
    "Topology",
]
