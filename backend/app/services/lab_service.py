"""Lab CRUD service."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lab import Lab, LabStatus


class LabService:
    async def list_labs(self, db: AsyncSession, limit: int = 50, offset: int = 0) -> List[Lab]:
        result = await db.execute(
            select(Lab).order_by(Lab.updated_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def count(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Lab.id)))
        return result.scalar() or 0

    async def count_running(self, db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(Lab.id)).where(Lab.status == LabStatus.RUNNING)
        )
        return result.scalar() or 0

    async def get(self, db: AsyncSession, lab_id: int) -> Optional[Lab]:
        result = await db.execute(select(Lab).where(Lab.id == lab_id))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, **kwargs) -> Lab:
        lab = Lab(**kwargs)
        db.add(lab)
        await db.flush()
        await db.refresh(lab)
        return lab

    async def update(self, db: AsyncSession, lab_id: int, **kwargs) -> Optional[Lab]:
        lab = await self.get(db, lab_id)
        if lab is None:
            return None
        for k, v in kwargs.items():
            if v is not None:
                setattr(lab, k, v)
        await db.flush()
        await db.refresh(lab)
        return lab

    async def delete(self, db: AsyncSession, lab_id: int) -> bool:
        lab = await self.get(db, lab_id)
        if lab is None:
            return False
        await db.delete(lab)
        await db.flush()
        return True


lab_service = LabService()
