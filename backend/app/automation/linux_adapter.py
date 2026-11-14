"""Linux host adapter using Paramiko."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.automation.base import DeviceAdapter

logger = logging.getLogger(__name__)


class LinuxAdapter(DeviceAdapter):
    """Adapter for Linux hosts via SSH (Paramiko)."""

    def __init__(self, host: str, username: str, password: str, **kwargs: Any) -> None:
        super().__init__(host, username, password, **kwargs)
        self.device_type = "linux"

    async def connect(self) -> bool:
        loop = asyncio.get_event_loop()
        try:
            import paramiko
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            await loop.run_in_executor(
                None,
                lambda: client.connect(
                    hostname=self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    timeout=10,
                ),
            )
            self._connection = client
            return True
        except Exception as exc:
            logger.error("Linux connect failed: %s", exc)
            return False

    async def disconnect(self) -> None:
        if self._connection:
            self._connection.close()
            self._connection = None

    async def send_command(self, command: str, **kwargs: Any) -> str:
        if not self._connection:
            raise RuntimeError("Not connected")
        loop = asyncio.get_event_loop()

        def _exec() -> str:
            _stdin, stdout, stderr = self._connection.exec_command(command, timeout=30)
            out = stdout.read().decode("utf-8", errors="replace")
            err = stderr.read().decode("utf-8", errors="replace")
            return out if out else err

        return await loop.run_in_executor(None, _exec)

    async def send_config(self, commands: List[str], **kwargs: Any) -> str:
        results: list[str] = []
        for cmd in commands:
            results.append(await self.send_command(cmd))
        return "\n".join(results)

    async def get_running_config(self) -> str:
        parts: list[str] = []
        parts.append(await self.send_command("hostname"))
        parts.append(await self.send_command("ip addr"))
        parts.append(await self.send_command("ip route"))
        return "\n".join(parts)

    async def get_interfaces(self) -> List[Dict[str, Any]]:
        output = await self.send_command("ip -br addr")
        interfaces: List[Dict[str, Any]] = []
        for line in output.strip().splitlines():
            parts = line.split()
            if len(parts) >= 2:
                interfaces.append({
                    "name": parts[0],
                    "status": parts[1].lower(),
                    "ip_address": parts[2] if len(parts) > 2 else None,
                })
        return interfaces
