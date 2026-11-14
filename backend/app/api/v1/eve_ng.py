"""EVE-NG integration endpoints with deployment and lab management."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.integrations.eve_ng.client import eve_ng_client

router = APIRouter(prefix="/eve-ng", tags=["EVE-NG"])


class EVEConfigRequest(BaseModel):
    host: str
    username: str = "admin"
    password: str = "eve"


class EVELabCreateRequest(BaseModel):
    name: str
    nodes: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    edges: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    description: Optional[str] = "Created by NETLAB AI"


class EVEDeployTopologyRequest(BaseModel):
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


@router.get("/status")
async def eve_status():
    available = await eve_ng_client.available()
    return {"available": available, "host": eve_ng_client._host or "Not configured"}


@router.post("/config")
async def eve_update_config(req: EVEConfigRequest):
    eve_ng_client.update_config(host=req.host, username=req.username, password=req.password)
    available = await eve_ng_client.available()
    return {
        "success": True,
        "host": req.host,
        "available": available,
        "message": "EVE-NG hypervisor address updated successfully." if available else "Address saved, but EVE-NG host is currently unreachable.",
    }


@router.post("/login")
async def eve_login():
    ok = await eve_ng_client.login()
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to login to EVE-NG")
    return {"message": "Logged in to EVE-NG"}


@router.get("/labs")
async def eve_list_labs():
    labs = await eve_ng_client.list_labs()
    return {"labs": labs}


@router.post("/labs")
async def eve_create_or_deploy_lab(req: EVELabCreateRequest):
    """Deploy or create a lab with nodes on EVE-NG."""
    res = await eve_ng_client.deploy_topology(
        name=req.name,
        nodes=req.nodes or [],
        edges=req.edges or [],
    )
    return res


@router.post("/deploy")
async def eve_deploy_topology(req: EVEDeployTopologyRequest):
    """Directly deploy canvas topology to EVE-NG."""
    res = await eve_ng_client.deploy_topology(
        name=req.name,
        nodes=req.nodes,
        edges=req.edges,
    )
    return res


@router.get("/labs/{lab_path:path}/nodes")
async def eve_lab_nodes(lab_path: str):
    nodes = await eve_ng_client.get_lab_nodes(lab_path)
    return {"nodes": nodes}


@router.post("/labs/{lab_path:path}/nodes/{node_id}/start")
async def eve_start_node(lab_path: str, node_id: int):
    ok = await eve_ng_client.start_node(lab_path, node_id)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to start node")
    return {"message": f"Node {node_id} started"}


@router.post("/labs/{lab_path:path}/nodes/{node_id}/stop")
async def eve_stop_node(lab_path: str, node_id: int):
    ok = await eve_ng_client.stop_node(lab_path, node_id)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to stop node")
    return {"message": f"Node {node_id} stopped"}


@router.post("/labs/{lab_path:path}/start-all")
async def eve_start_all_nodes(lab_path: str):
    ok = await eve_ng_client.start_all_nodes(lab_path)
    return {"success": ok, "message": f"All nodes in {lab_path} sent start command."}


@router.post("/labs/{lab_path:path}/stop-all")
async def eve_stop_all_nodes(lab_path: str):
    ok = await eve_ng_client.stop_all_nodes(lab_path)
    return {"success": ok, "message": f"All nodes in {lab_path} stopped."}
