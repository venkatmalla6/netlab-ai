"""Cisco Router adapter using Netmiko."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.automation.base import DeviceAdapter

logger = logging.getLogger(__name__)


class CiscoRouterAdapter(DeviceAdapter):
    """Adapter for Cisco IOS/IOS-XE routers via Netmiko."""

    def __init__(self, host: str, username: str, password: str, **kwargs: Any) -> None:
        super().__init__(host, username, password, **kwargs)
        self.device_type = kwargs.get("device_type", "cisco_ios")

    async def connect(self) -> bool:
        from netmiko import ConnectHandler

        loop = asyncio.get_event_loop()
        try:
            self._connection = await loop.run_in_executor(
                None,
                lambda: ConnectHandler(
                    device_type=self.device_type,
                    host=self.host,
                    username=self.username,
                    password=self.password,
                    port=self.port,
                ),
            )
            return True
        except Exception as exc:
            logger.error("Cisco router connect failed: %s", exc)
            return False

    async def disconnect(self) -> None:
        if self._connection:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._connection.disconnect)
            self._connection = None

    async def send_command(self, command: str, **kwargs: Any) -> str:
        if not self._connection:
            raise RuntimeError("Not connected")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._connection.send_command(command, **kwargs)
        )

    async def send_config(self, commands: List[str], **kwargs: Any) -> str:
        if not self._connection:
            raise RuntimeError("Not connected")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._connection.send_config_set(commands, **kwargs)
        )

    async def get_running_config(self) -> str:
        return await self.send_command("show running-config")

    async def get_interfaces(self) -> List[Dict[str, Any]]:
        output = await self.send_command("show ip interface brief")
        interfaces: List[Dict[str, Any]] = []
        for line in output.strip().splitlines()[1:]:
            parts = line.split()
            if len(parts) >= 6:
                interfaces.append({
                    "name": parts[0],
                    "ip_address": parts[1] if parts[1] != "unassigned" else None,
                    "status": parts[4],
                    "protocol": parts[5],
                })
        return interfaces
