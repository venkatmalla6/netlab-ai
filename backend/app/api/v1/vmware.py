"""VMware integration endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.integrations.vmware.client import vmware_client

router = APIRouter(prefix="/vmware", tags=["VMware"])


class VMwareConfigRequest(BaseModel):
    host: str
    username: str = "root"
    password: str = "eve"


@router.post("/config")
async def update_vmware_config(req: VMwareConfigRequest):
    """Update VMware hypervisor target and test connection."""
    vmware_client.update_config(host=req.host, username=req.username, password=req.password)
    avail = await vmware_client.available()
    return {
        "success": True,
        "host": req.host,
        "available": avail,
        "message": f"VMware host updated to {req.host}. Status: {'Online' if avail else 'Offline/Unreachable'}",
    }


@router.get("/status")
async def vmware_status():
    available = await vmware_client.available()
    return {"available": available, "host": vmware_client._host or "Not configured"}


@router.get("/vms")
async def list_vms():
    vms = await vmware_client.list_vms()
    return {"vms": vms}


@router.get("/vms/{vm_id}")
async def get_vm(vm_id: str):
    vm = await vmware_client.get_vm(vm_id)
    if vm is None:
        raise HTTPException(status_code=404, detail="VM not found")
    return vm


@router.post("/vms/{vm_id}/power-on")
async def power_on(vm_id: str):
    ok = await vmware_client.power_on(vm_id)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to power on VM")
    return {"message": f"VM {vm_id} powered on"}


@router.post("/vms/{vm_id}/power-off")
async def power_off(vm_id: str):
    ok = await vmware_client.power_off(vm_id)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to power off VM")
    return {"message": f"VM {vm_id} powered off"}
