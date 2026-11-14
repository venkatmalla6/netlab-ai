"""Database seeding module – pre-populates enterprise topologies, devices, and academy modules."""

import json
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lab import Lab, LabStatus
from app.models.device import Device, DeviceType, DeviceVendor, DeviceStatus, Interface, InterfaceStatus
from app.models.topology import Topology
from app.models.configuration import Configuration
from app.models.learning import LearningModule, LearningLesson, DifficultyLevel
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


async def seed_initial_data(session: AsyncSession) -> None:
    """Seed enterprise network topology and devices if database is empty."""
    # Check if topologies exist
    topo_res = await session.execute(select(Topology).limit(1))
    if topo_res.scalar_one_or_none() is not None:
        return

    logger.info("Seeding initial enterprise topology and CCNA academy data...")

    # 1. Create Enterprise Production Lab
    lab = Lab(
        name="Enterprise Dual-Core Campus",
        description="High-availability enterprise campus network with dual core switches, edge routing, and branch transit.",
        status=LabStatus.RUNNING,
    )
    session.add(lab)
    await session.flush()
    await session.refresh(lab)

    # 2. Devices
    devices_data = [
        {"name": "HQ-Edge-R1", "type": DeviceType.ROUTER, "vendor": DeviceVendor.CISCO, "platform": "IOSv", "ip": "10.0.0.1", "x": 140, "y": 80},
        {"name": "HQ-Edge-R2", "type": DeviceType.ROUTER, "vendor": DeviceVendor.CISCO, "platform": "IOSv", "ip": "10.0.0.2", "x": 420, "y": 80},
        {"name": "HQ-Core-SW1", "type": DeviceType.SWITCH, "vendor": DeviceVendor.CISCO, "platform": "IOSvL2", "ip": "192.168.10.1", "x": 140, "y": 260},
        {"name": "HQ-Core-SW2", "type": DeviceType.SWITCH, "vendor": DeviceVendor.CISCO, "platform": "IOSvL2", "ip": "192.168.20.1", "x": 420, "y": 260},
        {"name": "Branch-R3", "type": DeviceType.ROUTER, "vendor": DeviceVendor.CISCO, "platform": "IOSv", "ip": "172.16.1.1", "x": 700, "y": 170},
    ]

    dev_objs = {}
    for idx, d in enumerate(devices_data, start=1):
        dev = Device(
            lab_id=lab.id,
            name=d["name"],
            device_type=d["type"],
            vendor=d["vendor"],
            platform=d["platform"],
            status=DeviceStatus.RUNNING,
            management_ip=d["ip"],
            management_port=22,
            console_port=30000 + idx,
            x_position=float(d["x"]),
            y_position=float(d["y"]),
            config=(
                f"hostname {d['name']}\n!\n"
                f"interface GigabitEthernet0/0\n ip address {d['ip']} 255.255.255.0\n no shutdown\n!\n"
                f"router ospf 1\n router-id {idx}.{idx}.{idx}.{idx}\n network 0.0.0.0 255.255.255.255 area 0\n!\n"
                "line vty 0 4\n transport input ssh\n login local\n!\nend"
            ),
        )
        session.add(dev)
        await session.flush()
        await session.refresh(dev)
        dev_objs[d["name"]] = dev

        # Provision standard interfaces
        intfs = [
            Interface(device_id=dev.id, name="GigabitEthernet0/0", status=InterfaceStatus.UP, ip_address=d["ip"], subnet_mask="255.255.255.0"),
            Interface(device_id=dev.id, name="GigabitEthernet0/1", status=InterfaceStatus.UP, ip_address=None),
            Interface(device_id=dev.id, name="Loopback0", status=InterfaceStatus.UP, ip_address=f"{idx}.{idx}.{idx}.{idx}", subnet_mask="255.255.255.255"),
        ]
        session.add_all(intfs)

        # Baseline configuration version
        cfg = Configuration(
            device_id=dev.id,
            config_text=dev.config,
            version=1,
            description="Initial production baseline snapshot",
            created_by="NETLAB AI Installer",
        )
        session.add(cfg)

    # 3. Canvas Topology JSON
    topo_nodes = [
        {"id": d["name"], "type": "deviceNode", "position": {"x": d["x"], "y": d["y"]}, "data": {"label": d["name"], "type": d["type"].value, "platform": d["platform"], "ip": d["ip"]}}
        for d in devices_data
    ]
    topo_edges = [
        {"id": "e1", "source": "HQ-Edge-R1", "target": "HQ-Edge-R2", "label": "Gi0/0 <-> Gi0/0", "style": {"stroke": "#3b82f6", "strokeWidth": 2}},
        {"id": "e2", "source": "HQ-Edge-R1", "target": "HQ-Core-SW1", "label": "Gi0/1 <-> Gi0/0", "style": {"stroke": "#3b82f6", "strokeWidth": 2}},
        {"id": "e3", "source": "HQ-Edge-R2", "target": "HQ-Core-SW2", "label": "Gi0/1 <-> Gi0/0", "style": {"stroke": "#3b82f6", "strokeWidth": 2}},
        {"id": "e4", "source": "HQ-Core-SW1", "target": "HQ-Core-SW2", "label": "Gi0/1 <-> Gi0/1", "style": {"stroke": "#10b981", "strokeWidth": 2}},
        {"id": "e5", "source": "HQ-Edge-R2", "target": "Branch-R3", "label": "Gi0/2 <-> Gi0/0", "style": {"stroke": "#f59e0b", "strokeWidth": 2}},
    ]
    topo_json = json.dumps({"nodes": topo_nodes, "edges": topo_edges})

    topo = Topology(
        name="Enterprise Dual-Core Campus",
        description="Dual core distribution campus topology with redundant WAN edges and branch transit.",
        topology_json=topo_json,
    )
    session.add(topo)

    # Update lab with topology data
    lab.topology_data = topo_json

    # 4. CCNA & CCNP Learning Curriculum Modules
    mod1 = LearningModule(
        title="CCNA 200-301: IP Connectivity & Dynamic Routing",
        description="Master single-area and multi-area OSPFv2, path metric calculation, and neighbor convergence.",
        difficulty=DifficultyLevel.INTERMEDIATE,
        order=1,
    )
    session.add(mod1)
    await session.flush()
    await session.refresh(mod1)

    lesson1 = LearningLesson(
        module_id=mod1.id,
        title="OSPFv2 Adjacency Formation & DR/BDR Election",
        content=(
            "In broadcast multi-access networks (such as Ethernet), OSPF elects a Designated Router (DR) "
            "and Backup Designated Router (BDR) to minimize the number of neighbor adjacencies and reduce LSA flooding. "
            "Routers exchange Hello packets (Type 1) to transition through Down, Init, 2-Way, ExStart, Exchange, Loading, and Full states."
        ),
        order=1,
    )
    session.add(lesson1)

    # 5. Audit log
    audit = AuditLog(
        action="SYSTEM_INITIALIZED",
        entity_type="system",
        entity_id=1,
        details="Pre-seeded enterprise production topology (5 devices, 5 links) and CCNA curriculum.",
    )
    session.add(audit)

    await session.commit()
    logger.info("Pre-seeding completed successfully.")

