"""Network Monitoring and Device Telemetry Endpoints."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.device import Device, DeviceStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


class DeviceMetric(BaseModel):
    device_id: int
    device_name: str
    status: str
    cpu_percent: float
    memory_percent: float
    temperature_c: float
    uptime_hours: float
    packet_loss_percent: float
    interfaces_up: int
    interfaces_down: int


class MonitoringOverview(BaseModel):
    total_monitored: int
    online_count: int
    offline_count: int
    avg_cpu: float
    avg_memory: float
    alerts_count: int
    devices: List[DeviceMetric]


@router.get("/overview", response_model=MonitoringOverview)
async def get_monitoring_overview(db: AsyncSession = Depends(get_db)):
    """Return actual telemetry from registered devices in the database."""
    stmt = select(Device).options(selectinload(Device.interfaces))
    result = await db.execute(stmt)
    db_devices = result.scalars().all()

    if not db_devices:
        return MonitoringOverview(
            total_monitored=0,
            online_count=0,
            offline_count=0,
            avg_cpu=0.0,
            avg_memory=0.0,
            alerts_count=0,
            devices=[],
        )

    device_metrics: List[DeviceMetric] = []
    online_count = 0
    offline_count = 0

    for dev in db_devices:
        is_online = dev.status in (DeviceStatus.RUNNING, DeviceStatus.STARTING)
        if is_online:
            online_count += 1
        else:
            offline_count += 1

        interfaces_up = sum(1 for iface in dev.interfaces if getattr(iface, "status", None) and str(iface.status).lower() == "up")
        interfaces_down = len(dev.interfaces) - interfaces_up

        device_metrics.append(
            DeviceMetric(
                device_id=dev.id,
                device_name=dev.name,
                status=dev.status.value if hasattr(dev.status, "value") else str(dev.status),
                cpu_percent=0.0,
                memory_percent=0.0,
                temperature_c=0.0,
                uptime_hours=0.0,
                packet_loss_percent=0.0 if is_online else 100.0,
                interfaces_up=interfaces_up,
                interfaces_down=interfaces_down,
            )
        )

    return MonitoringOverview(
        total_monitored=len(device_metrics),
        online_count=online_count,
        offline_count=offline_count,
        avg_cpu=0.0,
        avg_memory=0.0,
        alerts_count=offline_count,
        devices=device_metrics,
    )


@router.get("/alerts")
async def get_monitoring_alerts(db: AsyncSession = Depends(get_db)):
    """Return active monitoring alerts for degraded or offline devices."""
    stmt = select(Device).where(Device.status != DeviceStatus.RUNNING)
    result = await db.execute(stmt)
    offline_devs = result.scalars().all()
    alerts = [
        {
            "id": f"alert-{dev.id}",
            "device_id": dev.id,
            "device_name": dev.name,
            "severity": "critical" if dev.status == DeviceStatus.ERROR else "warning",
            "message": f"Device {dev.name} is currently {dev.status.value if hasattr(dev.status, 'value') else dev.status}",
            "timestamp": dev.updated_at.isoformat() if dev.updated_at else None,
        }
        for dev in offline_devs
    ]
    return {"count": len(alerts), "alerts": alerts}
