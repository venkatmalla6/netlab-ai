"""Network Academy and Interactive Teaching Endpoints."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning", tags=["Network Academy"])


class AcademyTrack(BaseModel):
    id: str
    title: str
    track: str  # CCNA, CCNP, Network Automation
    description: str
    total_modules: int
    completed_modules: int
    progress_percent: float


class LessonItem(BaseModel):
    id: str
    title: str
    category: str
    difficulty: str
    duration_min: int
    summary: str
    key_commands: List[str]


@router.get("/tracks", response_model=List[AcademyTrack])
async def list_tracks():
    """List CCNA, CCNP, and Network Automation certification learning tracks."""
    return [
        AcademyTrack(
            id="ccna-200-301",
            title="Cisco Certified Network Associate (CCNA 200-301)",
            track="CCNA",
            description="Complete blueprint covering Network Fundamentals, IP Connectivity, Security, and Automation.",
            total_modules=12,
            completed_modules=4,
            progress_percent=33.3,
        ),
        AcademyTrack(
            id="ccnp-encor",
            title="CCNP Enterprise Core (350-401 ENCOR)",
            track="CCNP",
            description="Advanced routing protocols, BGP, OSPF multi-area, VRF, SD-WAN, and QoS architecture.",
            total_modules=16,
            completed_modules=1,
            progress_percent=6.25,
        ),
        AcademyTrack(
            id="net-auto-py",
            title="Network Automation with Python & Netmiko",
            track="Network Automation",
            description="Automating multi-vendor networks using Netmiko, NAPALM, RESTCONF, and Ansible.",
            total_modules=8,
            completed_modules=3,
            progress_percent=37.5,
        ),
    ]


@router.get("/lessons", response_model=List[LessonItem])
async def list_lessons(track: Optional[str] = Query(None)):
    """Return available lessons for the interactive networking instructor."""
    return [
        LessonItem(
            id="les-01",
            title="OSPFv2 Single Area Configuration & Adjacency Formation",
            category="IP Connectivity",
            difficulty="Intermediate",
            duration_min=25,
            summary="Learn how OSPF routers transition through Down, Init, 2-Way, ExStart, Exchange, Loading, and Full states.",
            key_commands=["router ospf 1", "network 192.168.1.0 0.0.0.255 area 0", "show ip ospf neighbor"],
        ),
        LessonItem(
            id="les-02",
            title="VLANs, 802.1Q Trunking and Inter-VLAN Routing",
            category="Layer 2 Switching",
            difficulty="Beginner",
            duration_min=20,
            summary="Configuring access ports, dynamic/static 802.1Q trunks, and Router-on-a-Stick (ROAS) subinterfaces.",
            key_commands=["vlan 10", "switchport mode trunk", "interface gig0/0.10", "encapsulation dot1Q 10"],
        ),
        LessonItem(
            id="les-03",
            title="BGP Autonomous Systems & eBGP Peering",
            category="Enterprise Routing",
            difficulty="Advanced",
            duration_min=35,
            summary="Establishing External BGP sessions between AS 65001 and AS 65002 with route advertisement verification.",
            key_commands=["router bgp 65001", "neighbor 10.1.1.2 remote-as 65002", "show ip bgp summary"],
        ),
    ]

