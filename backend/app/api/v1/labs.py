"""Lab management endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.lab import LabCreate, LabDetailResponse, LabResponse, LabUpdate
from app.services.lab_service import lab_service

router = APIRouter(prefix="/labs", tags=["Labs"])


@router.get("", response_model=List[LabResponse])
async def list_labs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    labs = await lab_service.list_labs(db, limit=limit, offset=offset)
    return [
        LabResponse(
            id=lab.id,
            name=lab.name,
            description=lab.description,
            status=lab.status.value,
            eve_ng_lab_id=lab.eve_ng_lab_id,
            topology_data=lab.topology_data,
            device_count=len(lab.devices),
            created_at=lab.created_at,
            updated_at=lab.updated_at,
        )
        for lab in labs
    ]


@router.get("/{lab_id}", response_model=LabDetailResponse)
async def get_lab(lab_id: int, db: AsyncSession = Depends(get_db)):
    lab = await lab_service.get(db, lab_id)
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    return lab


@router.post("", response_model=LabResponse, status_code=201)
async def create_lab(body: LabCreate, db: AsyncSession = Depends(get_db)):
    lab = await lab_service.create(db, **body.model_dump())
    return LabResponse(
        id=lab.id,
        name=lab.name,
        description=lab.description,
        status=lab.status.value,
        eve_ng_lab_id=lab.eve_ng_lab_id,
        topology_data=lab.topology_data,
        device_count=0,
        created_at=lab.created_at,
        updated_at=lab.updated_at,
    )


@router.put("/{lab_id}", response_model=LabResponse)
async def update_lab(lab_id: int, body: LabUpdate, db: AsyncSession = Depends(get_db)):
    lab = await lab_service.update(db, lab_id, **body.model_dump(exclude_unset=True))
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    return LabResponse(
        id=lab.id,
        name=lab.name,
        description=lab.description,
        status=lab.status.value,
        eve_ng_lab_id=lab.eve_ng_lab_id,
        topology_data=lab.topology_data,
        device_count=len(lab.devices),
        created_at=lab.created_at,
        updated_at=lab.updated_at,
    )


@router.delete("/{lab_id}")
async def delete_lab(lab_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await lab_service.delete(db, lab_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lab not found")
    return {"message": "Lab deleted", "success": True}
