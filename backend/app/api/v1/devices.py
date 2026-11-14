"""Device inventory endpoints."""

from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.lab import Lab, LabStatus
from app.models.device import Device, Interface, DeviceType, DeviceVendor, DeviceStatus, InterfaceStatus
from app.schemas.device import (
    DeviceCreate,
    DeviceDetailResponse,
    DeviceResponse,
    DeviceUpdate,
    InterfaceCreate,
    InterfaceResponse,
)

router = APIRouter(prefix="/devices", tags=["Devices"])


def _to_device_type(val: Any) -> DeviceType:
    if isinstance(val, DeviceType):
        return val
    try:
        return DeviceType(str(val or "router").lower())
    except (ValueError, AttributeError):
        return DeviceType.ROUTER


def _to_device_vendor(val: Any) -> DeviceVendor:
    if isinstance(val, DeviceVendor):
        return val
    try:
        return DeviceVendor(str(val or "cisco").lower())
    except (ValueError, AttributeError):
        return DeviceVendor.CISCO


def _to_device_status(val: Any) -> DeviceStatus:
    if isinstance(val, DeviceStatus):
        return val
    try:
        return DeviceStatus(str(val or "stopped").lower())
    except (ValueError, AttributeError):
        return DeviceStatus.STOPPED


def _to_interface_status(val: Any) -> InterfaceStatus:
    if isinstance(val, InterfaceStatus):
        return val
    try:
        return InterfaceStatus(str(val or "down").lower())
    except (ValueError, AttributeError):
        return InterfaceStatus.DOWN


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    lab_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Device).options(selectinload(Device.interfaces))
    if lab_id is not None:
        stmt = stmt.where(Device.lab_id == lab_id)
    stmt = stmt.order_by(Device.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    devices = result.scalars().all()
    return [
        DeviceResponse(
            id=d.id,
            lab_id=d.lab_id,
            name=d.name,
            device_type=d.device_type.value if hasattr(d.device_type, "value") else str(d.device_type),
            vendor=d.vendor.value if hasattr(d.vendor, "value") else str(d.vendor),
            platform=d.platform,
            status=d.status.value if hasattr(d.status, "value") else str(d.status),
            management_ip=d.management_ip,
            management_port=d.management_port,
            console_port=d.console_port,
            x_position=d.x_position,
            y_position=d.y_position,
            interface_count=len(d.interfaces or []),
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in devices
    ]


@router.get("/{device_id}", response_model=DeviceDetailResponse)
async def get_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Device).where(Device.id == device_id).options(selectinload(Device.interfaces))
    )
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return DeviceDetailResponse(
        id=device.id,
        lab_id=device.lab_id,
        name=device.name,
        device_type=device.device_type.value if hasattr(device.device_type, "value") else str(device.device_type),
        vendor=device.vendor.value if hasattr(device.vendor, "value") else str(device.vendor),
        platform=device.platform,
        status=device.status.value if hasattr(device.status, "value") else str(device.status),
        management_ip=device.management_ip,
        management_port=device.management_port,
        console_port=device.console_port,
        x_position=device.x_position,
        y_position=device.y_position,
        config=device.config,
        interface_count=len(device.interfaces or []),
        interfaces=[
            InterfaceResponse(
                id=i.id,
                device_id=i.device_id,
                name=i.name,
                ip_address=i.ip_address,
                subnet_mask=i.subnet_mask,
                mac_address=i.mac_address,
                status=i.status.value if hasattr(i.status, "value") else str(i.status),
                speed=i.speed,
                duplex=i.duplex,
                description=i.description,
                created_at=i.created_at,
            )
            for i in (device.interfaces or [])
        ],
        created_at=device.created_at,
        updated_at=device.updated_at,
    )


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(body: DeviceCreate, db: AsyncSession = Depends(get_db)):
    lab_id = body.lab_id
    if lab_id is None:
        lab_res = await db.execute(select(Lab).limit(1))
        lab = lab_res.scalar_one_or_none()
        if lab is None:
            lab = Lab(name="Enterprise Production Lab", description="Default network environment", status=LabStatus.RUNNING)
            db.add(lab)
            await db.flush()
            await db.refresh(lab)
        lab_id = lab.id

    dev_data = body.model_dump()
    dev_data["lab_id"] = lab_id
    dev_data["device_type"] = _to_device_type(dev_data.get("device_type"))
    dev_data["vendor"] = _to_device_vendor(dev_data.get("vendor"))

    device = Device(**dev_data)
    db.add(device)
    await db.flush()
    await db.refresh(device)

    # Automatically add initial interfaces
    intf1 = Interface(device_id=device.id, name="GigabitEthernet0/0", status=InterfaceStatus.UP, ip_address=device.management_ip or "192.168.1.1", subnet_mask="255.255.255.0")
    intf2 = Interface(device_id=device.id, name="GigabitEthernet0/1", status=InterfaceStatus.UP, ip_address=None)
    db.add_all([intf1, intf2])
    await db.flush()

    return DeviceResponse(
        id=device.id,
        lab_id=device.lab_id,
        name=device.name,
        device_type=device.device_type.value if hasattr(device.device_type, "value") else str(device.device_type),
        vendor=device.vendor.value if hasattr(device.vendor, "value") else str(device.vendor),
        platform=device.platform,
        status=device.status.value if hasattr(device.status, "value") else str(device.status),
        management_ip=device.management_ip,
        management_port=device.management_port,
        console_port=device.console_port,
        x_position=device.x_position,
        y_position=device.y_position,
        interface_count=2,
        created_at=device.created_at,
        updated_at=device.updated_at,
    )


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: int, body: DeviceUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Device).where(Device.id == device_id).options(selectinload(Device.interfaces))
    )
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "device_type" and v:
            setattr(device, k, _to_device_type(v))
        elif k == "vendor" and v:
            setattr(device, k, _to_device_vendor(v))
        elif k == "status" and v:
            setattr(device, k, _to_device_status(v))
        else:
            setattr(device, k, v)

    await db.flush()
    await db.refresh(device)

    return DeviceResponse(
        id=device.id,
        lab_id=device.lab_id,
        name=device.name,
        device_type=device.device_type.value if hasattr(device.device_type, "value") else str(device.device_type),
        vendor=device.vendor.value if hasattr(device.vendor, "value") else str(device.vendor),
        platform=device.platform,
        status=device.status.value if hasattr(device.status, "value") else str(device.status),
        management_ip=device.management_ip,
        management_port=device.management_port,
        console_port=device.console_port,
        x_position=device.x_position,
        y_position=device.y_position,
        interface_count=len(device.interfaces or []),
        created_at=device.created_at,
        updated_at=device.updated_at,
    )


@router.delete("/{device_id}")
async def delete_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    await db.delete(device)
    await db.flush()
    return {"message": "Device deleted", "success": True}


@router.post("/{device_id}/interfaces", response_model=InterfaceResponse, status_code=201)
async def add_interface(
    device_id: int,
    body: InterfaceCreate,
    db: AsyncSession = Depends(get_db),
):
    device = await db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    status_enum = _to_interface_status(body.status)
    interface = Interface(
        device_id=device_id,
        name=body.name,
        ip_address=body.ip_address,
        subnet_mask=body.subnet_mask,
        mac_address=body.mac_address,
        status=status_enum,
        speed=body.speed,
        duplex=body.duplex,
        description=body.description,
    )
    db.add(interface)
    await db.flush()
    await db.refresh(interface)
    return InterfaceResponse(
        id=interface.id,
        device_id=interface.device_id,
        name=interface.name,
        ip_address=interface.ip_address,
        subnet_mask=interface.subnet_mask,
        mac_address=interface.mac_address,
        status=interface.status.value if hasattr(interface.status, "value") else str(interface.status),
        speed=interface.speed,
        duplex=interface.duplex,
        description=interface.description,
        created_at=interface.created_at,
    )
