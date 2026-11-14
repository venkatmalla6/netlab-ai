"""Abstract base device adapter for network automation."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class DeviceAdapter(ABC):
    """Base class for device-specific automation adapters."""

    def __init__(self, host: str, username: str, password: str, **kwargs: Any) -> None:
        self.host = host
        self.username = username
        self.password = password
        self.port: int = kwargs.get("port", 22)
        self.device_type: str = kwargs.get("device_type", "generic")
        self._connection: Any = None

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the device."""
        ...

    @abstractmethod
    async def disconnect(self) -> None:
        """Close the connection."""
        ...

    @abstractmethod
    async def send_command(self, command: str, **kwargs: Any) -> str:
        """Execute a single command and return the output."""
        ...

    @abstractmethod
    async def send_config(self, commands: List[str], **kwargs: Any) -> str:
        """Send configuration commands and return the output."""
        ...

    @abstractmethod
    async def get_running_config(self) -> str:
        """Retrieve the running configuration."""
        ...

    @abstractmethod
    async def get_interfaces(self) -> List[Dict[str, Any]]:
        """List interfaces and their status."""
        ...

    @property
    def is_connected(self) -> bool:
        return self._connection is not None

    async def __aenter__(self) -> "DeviceAdapter":
        await self.connect()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.disconnect()
