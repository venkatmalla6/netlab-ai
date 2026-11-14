"""Dashboard service – aggregate statistics."""

from __future__ import annotations

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.chat import ChatMessage, ChatSession
from app.models.configuration import Configuration
from app.models.device import Device, DeviceStatus
from app.models.lab import Lab, LabStatus
from app.models.topology import Topology
from app.schemas.dashboard import DashboardResponse, DashboardStats, RecentActivity


class DashboardService:
    async def get_dashboard(self, db: AsyncSession) -> DashboardResponse:
        stats = await self._get_stats(db)
        activity = await self._get_recent_activity(db)
        return DashboardResponse(stats=stats, recent_activity=activity)

    async def _get_stats(self, db: AsyncSession) -> DashboardStats:
        total_labs = (await db.execute(select(func.count(Lab.id)))).scalar() or 0
        running_labs = (
            await db.execute(select(func.count(Lab.id)).where(Lab.status == LabStatus.RUNNING))
        ).scalar() or 0
        total_devices = (await db.execute(select(func.count(Device.id)))).scalar() or 0
        running_devices = (
            await db.execute(select(func.count(Device.id)).where(Device.status == DeviceStatus.RUNNING))
        ).scalar() or 0
        total_topologies = (await db.execute(select(func.count(Topology.id)))).scalar() or 0
        total_configurations = (await db.execute(select(func.count(Configuration.id)))).scalar() or 0
        total_chat_sessions = (await db.execute(select(func.count(ChatSession.id)))).scalar() or 0
        total_chat_messages = (await db.execute(select(func.count(ChatMessage.id)))).scalar() or 0

        return DashboardStats(
            total_labs=total_labs,
            running_labs=running_labs,
            total_devices=total_devices,
            running_devices=running_devices,
            total_topologies=total_topologies,
            total_configurations=total_configurations,
            total_chat_sessions=total_chat_sessions,
            total_chat_messages=total_chat_messages,
        )

    async def _get_recent_activity(self, db: AsyncSession, limit: int = 20) -> list[RecentActivity]:
        result = await db.execute(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        )
        logs = result.scalars().all()
        return [
            RecentActivity(
                id=log.id,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=log.details,
                created_at=log.created_at,
            )
            for log in logs
        ]


dashboard_service = DashboardService()
