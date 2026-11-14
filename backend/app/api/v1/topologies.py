"""Topology CRUD endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.topology import TopologyCreate, TopologyResponse, TopologyUpdate
from app.services.topology_service import topology_service

router = APIRouter(prefix="/topologies", tags=["Topologies"])


@router.get("", response_model=List[TopologyResponse])
async def list_topologies(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await topology_service.list_topologies(db, limit=limit, offset=offset)


@router.get("/{topology_id}", response_model=TopologyResponse)
async def get_topology(topology_id: int, db: AsyncSession = Depends(get_db)):
    topo = await topology_service.get(db, topology_id)
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")
    return topo


@router.post("", response_model=TopologyResponse, status_code=201)
async def create_topology(body: TopologyCreate, db: AsyncSession = Depends(get_db)):
    return await topology_service.create(db, **body.model_dump())


@router.put("/{topology_id}", response_model=TopologyResponse)
async def update_topology(
    topology_id: int, body: TopologyUpdate, db: AsyncSession = Depends(get_db)
):
    topo = await topology_service.update(db, topology_id, **body.model_dump(exclude_unset=True))
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")
    return topo


@router.post("/{topology_id}/sync")
async def sync_topology_devices(topology_id: int, db: AsyncSession = Depends(get_db)):
    topo = await topology_service.get(db, topology_id)
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")
    await topology_service.sync_topology_to_devices(db, topo)
    return {"message": f"Topology '{topo.name}' synchronized to live device inventory.", "success": True}


@router.delete("/{topology_id}")
async def delete_topology(topology_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await topology_service.delete(db, topology_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Topology not found")
    return {"message": "Topology deleted", "success": True}
