"""Topology CRUD service with automatic Lab and Device inventory synchronization."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.device import Device, DeviceStatus, DeviceType, DeviceVendor, Interface, InterfaceStatus
from app.models.lab import Lab, LabStatus
from app.models.topology import Topology

logger = logging.getLogger(__name__)


def _map_device_type(raw_type: Optional[str]) -> DeviceType:
    raw = (raw_type or "").lower()
    if "switch" in raw:
        return DeviceType.SWITCH
    if "firewall" in raw or "asa" in raw:
        return DeviceType.FIREWALL
    if "server" in raw:
        return DeviceType.SERVER
    if "cloud" in raw:
        return DeviceType.CLOUD
    if "pc" in raw or "workstation" in raw:
        return DeviceType.WORKSTATION
    return DeviceType.ROUTER


def _map_device_vendor(raw_vendor: Optional[str]) -> DeviceVendor:
    raw = (raw_vendor or "").lower()
    if "juniper" in raw:
        return DeviceVendor.JUNIPER
    if "arista" in raw:
        return DeviceVendor.ARISTA
    if "linux" in raw or "ubuntu" in raw:
        return DeviceVendor.LINUX
    if "windows" in raw:
        return DeviceVendor.WINDOWS
    return DeviceVendor.CISCO


class TopologyService:
    async def list_topologies(self, db: AsyncSession, limit: int = 50, offset: int = 0) -> List[Topology]:
        result = await db.execute(
            select(Topology).order_by(Topology.updated_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def count(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Topology.id)))
        return result.scalar() or 0

    async def get(self, db: AsyncSession, topology_id: int) -> Optional[Topology]:
        result = await db.execute(select(Topology).where(Topology.id == topology_id))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, **kwargs: Any) -> Topology:
        topo = Topology(**kwargs)
        db.add(topo)
        await db.flush()
        await db.refresh(topo)

        # Sync nodes to real Device and Lab records in netlab.db
        if topo.topology_json:
            try:
                await self.sync_topology_to_devices(db, topo)
            except Exception as exc:
                logger.error("Failed to sync topology to devices: %s", exc)

        return topo

    async def update(self, db: AsyncSession, topology_id: int, **kwargs: Any) -> Optional[Topology]:
        topo = await self.get(db, topology_id)
        if topo is None:
            return None
        for k, v in kwargs.items():
            if v is not None:
                setattr(topo, k, v)
        await db.flush()
        await db.refresh(topo)

        if topo.topology_json:
            try:
                await self.sync_topology_to_devices(db, topo)
            except Exception as exc:
                logger.error("Failed to sync topology to devices: %s", exc)

        return topo

    async def delete(self, db: AsyncSession, topology_id: int) -> bool:
        topo = await self.get(db, topology_id)
        if topo is None:
            return False
        await db.delete(topo)
        await db.flush()
        return True

    async def sync_topology_to_devices(self, db: AsyncSession, topo: Topology) -> None:
        """Parse topology_json and reflect nodes/links in Lab, Device, Interface, and Connection tables."""
        if not topo.topology_json:
            return

        try:
            data: Dict[str, Any] = json.loads(topo.topology_json)
        except Exception as exc:
            logger.warning("Could not parse topology JSON for '%s': %s", topo.name, exc)
            return

        nodes: List[Dict[str, Any]] = data.get("nodes", [])
        edges: List[Dict[str, Any]] = data.get("edges", [])

        # 1. Get or create corresponding Lab
        stmt = select(Lab).where(Lab.name == topo.name)
        result = await db.execute(stmt)
        lab = result.scalar_one_or_none()

        if lab is None:
            lab = Lab(
                name=topo.name,
                description=topo.description or f"Lab synced from topology {topo.name}",
                status=LabStatus.RUNNING if nodes else LabStatus.STOPPED,
                topology_data=topo.topology_json,
            )
            db.add(lab)
            await db.flush()
            await db.refresh(lab)
        else:
            lab.topology_data = topo.topology_json
            lab.status = LabStatus.RUNNING if nodes else LabStatus.STOPPED

        # 2. Get existing devices for this lab with eager loading on interfaces
        dev_stmt = select(Device).where(Device.lab_id == lab.id).options(selectinload(Device.interfaces))
        dev_result = await db.execute(dev_stmt)
        existing_devices = {d.name: d for d in dev_result.scalars().all()}

        device_map: Dict[str, Device] = {}

        for n in nodes:
            n_data = n.get("data", {})
            name = n_data.get("label") or n.get("id") or "Device"
            raw_type = n_data.get("type", "router")
            raw_vendor = n_data.get("vendor", "cisco")
            pos = n.get("position", {})
            ip = n_data.get("ip") or ""

            device_type = _map_device_type(raw_type)
            vendor = _map_device_vendor(raw_vendor)
            platform = "IOSvL2" if device_type == DeviceType.SWITCH else ("IOSv" if device_type == DeviceType.ROUTER else "Native")

            if name in existing_devices:
                dev = existing_devices[name]
                dev.device_type = device_type
                dev.vendor = vendor
                dev.platform = platform
                dev.management_ip = ip or dev.management_ip
                dev.x_position = float(pos.get("x", dev.x_position or 0.0))
                dev.y_position = float(pos.get("y", dev.y_position or 0.0))
                dev.status = DeviceStatus.RUNNING
            else:
                dev = Device(
                    lab_id=lab.id,
                    name=name,
                    device_type=device_type,
                    vendor=vendor,
                    platform=platform,
                    status=DeviceStatus.RUNNING,
                    management_ip=ip or f"192.168.1.{10 + len(device_map)}",
                    management_port=22,
                    console_port=30000 + len(device_map),
                    x_position=float(pos.get("x", 0.0)),
                    y_position=float(pos.get("y", 0.0)),
                )
                db.add(dev)
                await db.flush()
                await db.refresh(dev)

            device_map[str(n.get("id", name))] = dev
            device_map[name] = dev

            # Ensure default interfaces exist
            existing_intf_names = {i.name for i in (dev.interfaces or [])}
            if not existing_intf_names:
                if device_type == DeviceType.SWITCH:
                    intf_names = ["FastEthernet0/1", "FastEthernet0/2", "GigabitEthernet0/1", "GigabitEthernet0/2"]
                else:
                    intf_names = ["GigabitEthernet0/0", "GigabitEthernet0/1", "GigabitEthernet0/2", "Loopback0"]

                for intf_name in intf_names:
                    intf = Interface(
                        device_id=dev.id,
                        name=intf_name,
                        status=InterfaceStatus.UP,
                        speed="1Gbps" if "Gigabit" in intf_name else "100Mbps",
                        ip_address=dev.management_ip if intf_name in ("GigabitEthernet0/0", "Loopback0") else None,
                        subnet_mask="255.255.255.0" if intf_name in ("GigabitEthernet0/0", "Loopback0") else None,
                    )
                    db.add(intf)

        await db.flush()

        # Audit log entry
        audit = AuditLog(
            action="TOPOLOGY_SYNCED_TO_DEVICES",
            entity_type="topology",
            entity_id=topo.id,
            details=f"Synced topology '{topo.name}' with {len(nodes)} devices and {len(edges)} connections to netlab.db.",
        )
        db.add(audit)
        await db.commit()


topology_service = TopologyService()
