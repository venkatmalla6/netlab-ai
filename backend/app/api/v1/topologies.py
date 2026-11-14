"""Topology CRUD endpoints."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
import xml.etree.ElementTree as ET

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.topology import TopologyCreate, TopologyResponse, TopologyUpdate
from app.services.topology_service import topology_service

router = APIRouter(prefix="/topologies", tags=["Topologies"])


class TopologyExportResponse(BaseModel):
    format: str
    filename: str
    content: str
    metadata: Dict[str, Any]


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


@router.get("/{topology_id}/export/ansible", response_model=TopologyExportResponse)
async def export_topology_ansible(topology_id: int, db: AsyncSession = Depends(get_db)):
    """Export topology as production Ansible inventory and playbook."""
    topo = await topology_service.get(db, topology_id)
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")

    try:
        data = json.loads(topo.topology_json or getattr(topo, "topology_data", None) or "{}")
    except Exception:
        data = {}

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    # Group nodes by type
    routers, switches, firewalls, others = [], [], [], []
    for idx, n in enumerate(nodes):
        label = n.get("data", {}).get("label") or n.get("id") or f"node_{idx+1}"
        dev_type = (n.get("data", {}).get("type") or "router").lower()
        ip_addr = n.get("data", {}).get("ip") or f"10.10.10.{idx+1}"
        entry = f"    {label}:\n      ansible_host: {ip_addr}\n      ansible_network_os: cisco.ios.ios"
        if "switch" in dev_type:
            switches.append(entry)
        elif "firewall" in dev_type:
            firewalls.append(entry)
        elif "router" in dev_type:
            routers.append(entry)
        else:
            others.append(entry)

    inventory_lines = [
        "all:",
        "  vars:",
        "    ansible_connection: network_cli",
        "    ansible_user: admin",
        "    ansible_ssh_pass: cisco123",
        "  children:",
        "    routers:",
        "      hosts:",
    ] + (routers or ["        # No routers in topology"]) + [
        "    switches:",
        "      hosts:",
    ] + (switches or ["        # No switches in topology"]) + [
        "    firewalls:",
        "      hosts:",
    ] + (firewalls or ["        # No firewalls in topology"])

    playbook_sample = [
        "---",
        "- name: Configure NETLAB AI Enterprise Fabric",
        f"  # Topology: {topo.name}",
        "  hosts: all",
        "  gather_facts: false",
        "  tasks:",
        "    - name: Verify Device Reachability & Gather IOS Facts",
        "      cisco.ios.ios_facts:",
        "        gather_subset: min",
        "      register: dev_facts",
        "",
        "    - name: Ensure Base Banner Configuration",
        "      cisco.ios.ios_banner:",
        "        banner: motd",
        f"        text: 'Authorized Access Only - NETLAB AI Managed Fabric: {topo.name}'",
        "        state: present",
    ]

    full_content = "# ================================================================\n"
    full_content += f"# ANSIBLE INVENTORY: {topo.name}\n"
    full_content += "# ================================================================\n\n"
    full_content += "\n".join(inventory_lines)
    full_content += "\n\n# ================================================================\n"
    full_content += "# COMPANION PLAYBOOK (site.yaml)\n"
    full_content += "# ================================================================\n\n"
    full_content += "\n".join(playbook_sample)

    return TopologyExportResponse(
        format="ansible",
        filename=f"inventory_{topo.id}.yaml",
        content=full_content,
        metadata={"nodes_count": len(nodes), "links_count": len(edges)},
    )


@router.get("/{topology_id}/export/terraform", response_model=TopologyExportResponse)
async def export_topology_terraform(topology_id: int, db: AsyncSession = Depends(get_db)):
    """Export topology as Terraform Infrastructure-as-Code (HCL)."""
    topo = await topology_service.get(db, topology_id)
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")

    try:
        data = json.loads(topo.topology_json or getattr(topo, "topology_data", None) or "{}")
    except Exception:
        data = {}

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    tf_lines = [
        "terraform {",
        "  required_providers {",
        "    ciscoios = {",
        "      source  = \"netascode/ciscoios\"",
        "      version = \">= 0.2.0\"",
        "    }",
        "  }",
        "}",
        "",
        f"# NETLAB AI Topology Terraform Manifest: {topo.name}",
        "",
    ]

    for idx, n in enumerate(nodes):
        label = (n.get("data", {}).get("label") or f"node_{idx+1}").replace("-", "_")
        dev_type = n.get("data", {}).get("type") or "router"
        tf_lines.extend([
            f"resource \"ciscoios_device\" \"{label}\" {{",
            f"  name     = \"{label}\"",
            f"  type     = \"{dev_type}\"",
            f"  host     = \"10.10.10.{idx+1}\"",
            "  username = \"admin\"",
            "  password = var.device_password",
            "}",
            "",
        ])

    return TopologyExportResponse(
        format="terraform",
        filename=f"topology_{topo.id}.tf",
        content="\n".join(tf_lines),
        metadata={"nodes_count": len(nodes), "links_count": len(edges)},
    )


@router.get("/{topology_id}/export/eve-unl", response_model=TopologyExportResponse)
async def export_topology_eve_unl(topology_id: int, db: AsyncSession = Depends(get_db)):
    """Export topology as native EVE-NG XML (.unl) lab file."""
    topo = await topology_service.get(db, topology_id)
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")

    try:
        data = json.loads(topo.topology_json or getattr(topo, "topology_data", None) or "{}")
    except Exception:
        data = {}

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    lab = ET.Element("lab", name=topo.name, version="1")
    desc = ET.SubElement(lab, "description")
    desc.text = topo.description or f"NETLAB AI Exported Topology: {topo.name}"

    nodes_elem = ET.SubElement(lab, "nodes")
    for idx, n in enumerate(nodes, start=1):
        label = n.get("data", {}).get("label") or f"Node_{idx}"
        pos = n.get("position", {})
        ET.SubElement(
            nodes_elem,
            "node",
            id=str(idx),
            name=label,
            type="qemu",
            template="vios",
            image="vios-adventerprisek9-m.vmdk",
            left=str(int(pos.get("x", 100))),
            top=str(int(pos.get("y", 100))),
        )

    networks_elem = ET.SubElement(lab, "networks")
    for idx, e in enumerate(edges, start=1):
        ET.SubElement(
            networks_elem,
            "network",
            id=str(idx),
            type="bridge",
            name=f"Net_{e.get('source')}_{e.get('target')}",
            left="0",
            top="0",
        )

    xml_str = ET.tostring(lab, encoding="unicode")
    pretty_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'

    return TopologyExportResponse(
        format="eve_unl",
        filename=f"{topo.name.replace(' ', '_')}.unl",
        content=pretty_xml,
        metadata={"nodes_count": len(nodes), "links_count": len(edges)},
    )


@router.get("/{topology_id}/export/netmiko", response_model=TopologyExportResponse)
async def export_topology_netmiko(topology_id: int, db: AsyncSession = Depends(get_db)):
    """Export topology as runnable Python Netmiko automation script."""
    topo = await topology_service.get(db, topology_id)
    if topo is None:
        raise HTTPException(status_code=404, detail="Topology not found")

    try:
        data = json.loads(topo.topology_json or getattr(topo, "topology_data", None) or "{}")
    except Exception:
        data = {}

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    py_lines = [
        "#!/usr/bin/env python3",
        f"\"\"\"NETLAB AI Automated Netmiko Script for Topology: {topo.name}\"\"\"",
        "",
        "import logging",
        "from netmiko import ConnectHandler",
        "",
        "logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')",
        "",
        "DEVICES = [",
    ]

    for idx, n in enumerate(nodes, start=1):
        label = n.get("data", {}).get("label") or f"Device_{idx}"
        ip = n.get("data", {}).get("ip") or f"10.10.10.{idx}"
        py_lines.extend([
            "    {",
            f"        'name': '{label}',",
            "        'device_type': 'cisco_ios',",
            f"        'host': '{ip}',",
            "        'username': 'admin',",
            "        'password': 'cisco',",
            "        'secret': 'cisco',",
            "    },",
        ])

    py_lines.extend([
        "]",
        "",
        "def audit_fabric():",
        "    for dev in DEVICES:",
        "        logging.info(f\"Connecting to {dev['name']} ({dev['host']})...\")",
        "        try:",
        "            handler_params = {k: v for k, v in dev.items() if k != 'name'}",
        "            with ConnectHandler(**handler_params) as net_connect:",
        "                net_connect.enable()",
        "                output = net_connect.send_command('show ip interface brief')",
        "                print(f\"\\n--- {dev['name']} Interfaces ---\\n{output}\\n\")",
        "        except Exception as e:",
        "            logging.error(f\"Failed to execute on {dev['name']}: {e}\")",
        "",
        "if __name__ == '__main__':",
        "    audit_fabric()",
    ])

    return TopologyExportResponse(
        format="netmiko",
        filename=f"deploy_{topo.id}.py",
        content="\n".join(py_lines),
        metadata={"nodes_count": len(nodes), "links_count": len(edges)},
    )


@router.delete("/{topology_id}")
async def delete_topology(topology_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await topology_service.delete(db, topology_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Topology not found")
    return {"message": "Topology deleted", "success": True}
