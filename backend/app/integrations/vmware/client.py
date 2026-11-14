"""VMware ESXi / vCenter client (via REST API)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class VMwareClient:
    """Async client for basic VMware ESXi management."""

    def __init__(self) -> None:
        self._host: Optional[str] = settings.VMWARE_HOST
        self._username: str = settings.VMWARE_USERNAME
        self._password: str = settings.VMWARE_PASSWORD

    def update_config(self, host: str, username: str = "root", password: str = "eve") -> None:
        """Update host and credentials dynamically."""
        self._host = host.strip()
        self._username = username.strip()
        self._password = password.strip()

    @property
    def base_url(self) -> str:
        return f"https://{self._host}" if self._host else ""

    async def available(self) -> bool:
        if not self._host:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
                resp = await client.get(f"{self.base_url}/ui/")
                return resp.status_code in (200, 301, 302)
        except Exception:
            return False

    async def list_vms(self) -> List[Dict[str, Any]]:
        """List VMs via the REST API (if available)."""
        if not self._host:
            return []
        try:
            async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                resp = await client.get(
                    f"{self.base_url}/rest/vcenter/vm",
                    auth=(self._username, self._password),
                )
                if resp.status_code == 200:
                    return resp.json().get("value", [])
                return []
        except Exception as exc:
            logger.error("VMware list_vms failed: %s", exc)
            return []

    async def get_vm(self, vm_id: str) -> Optional[Dict[str, Any]]:
        if not self._host:
            return None
        try:
            async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                resp = await client.get(
                    f"{self.base_url}/rest/vcenter/vm/{vm_id}",
                    auth=(self._username, self._password),
                )
                if resp.status_code == 200:
                    return resp.json().get("value")
                return None
        except Exception as exc:
            logger.error("VMware get_vm failed: %s", exc)
            return None

    async def power_on(self, vm_id: str) -> bool:
        return await self._power_action(vm_id, "start")

    async def power_off(self, vm_id: str) -> bool:
        return await self._power_action(vm_id, "stop")

    async def _power_action(self, vm_id: str, action: str) -> bool:
        if not self._host:
            return False
        try:
            async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                resp = await client.post(
                    f"{self.base_url}/rest/vcenter/vm/{vm_id}/power/{action}",
                    auth=(self._username, self._password),
                )
                return resp.status_code in (200, 204)
        except Exception as exc:
            logger.error("VMware power %s failed: %s", action, exc)
            return False


vmware_client = VMwareClient()
