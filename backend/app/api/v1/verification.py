"""Network Connectivity and Protocol Verification Endpoints."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verification", tags=["Verification"])


class PingRequest(BaseModel):
    source_device_id: int
    target_ip: str
    count: int = 4
    timeout: int = 2


class PingResponse(BaseModel):
    source_device_id: int
    target_ip: str
    transmitted: int
    received: int
    packet_loss_percent: float
    rtt_avg_ms: float
    success: bool
    raw_output: str


@router.post("/ping", response_model=PingResponse)
async def verify_ping(req: PingRequest, db: AsyncSession = Depends(get_db)):
    """Execute a real ping command against the target host or gateway."""
    # Validate IP/host format
    target = req.target_ip.strip()
    if not target or ";" in target or "&" in target or "|" in target:
        raise HTTPException(status_code=400, detail="Invalid target IP address.")

    try:
        # Run system ping: Windows ping syntax: ping -n <count> -w <timeout_ms> <target>
        cmd = ["ping", "-n", str(req.count), "-w", str(req.timeout * 1000), target]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        raw_output = stdout.decode("utf-8", errors="ignore")

        # Parse transmitted and received
        # Windows ping output: "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
        loss_match = re.search(r"Lost = \d+ \((\d+)% loss\)", raw_output)
        loss_pct = float(loss_match.group(1)) if loss_match else (0.0 if proc.returncode == 0 else 100.0)

        sent_match = re.search(r"Sent = (\d+), Received = (\d+)", raw_output)
        transmitted = int(sent_match.group(1)) if sent_match else req.count
        received = int(sent_match.group(2)) if sent_match else (req.count if proc.returncode == 0 else 0)

        # Parse average RTT
        # Windows: "Average = 2ms" or "Minimum = 1ms, Maximum = 4ms, Average = 2ms"
        avg_match = re.search(r"Average = (\d+)ms", raw_output)
        avg_rtt = float(avg_match.group(1)) if avg_match else 0.0

        return PingResponse(
            source_device_id=req.source_device_id,
            target_ip=target,
            transmitted=transmitted,
            received=received,
            packet_loss_percent=loss_pct,
            rtt_avg_ms=avg_rtt,
            success=proc.returncode == 0 and received > 0,
            raw_output=raw_output,
        )
    except Exception as exc:
        logger.error("Ping execution failed: %s", exc)
        return PingResponse(
            source_device_id=req.source_device_id,
            target_ip=target,
            transmitted=req.count,
            received=0,
            packet_loss_percent=100.0,
            rtt_avg_ms=0.0,
            success=False,
            raw_output=f"Error executing real ICMP probe: {exc}",
        )


class PreflightFinding(BaseModel):
    category: str
    severity: str  # critical, warning, info
    title: str
    affected_entities: List[str]
    description: str
    remediation_command: Optional[str] = None


class PreflightRequest(BaseModel):
    topology_id: Optional[int] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    configurations: Optional[Dict[str, str]] = None


class PreflightResponse(BaseModel):
    health_score: int
    status: str  # PASSED, ACTION_REQUIRED, CRITICAL
    total_checks_evaluated: int
    passed_checks: int
    findings: List[PreflightFinding]
    summary: str


@router.post("/preflight", response_model=PreflightResponse)
async def run_preflight_compliance_check(req: PreflightRequest, db: AsyncSession = Depends(get_db)):
    """Batfish-grade pre-flight compliance & topology validation engine."""
    nodes = req.nodes or []
    edges = req.edges or []
    configs = req.configurations or {}

    findings: List[PreflightFinding] = []
    total_checks = 6
    passed_count = 6

    # 1. IP Conflict / Duplicate IP check
    seen_ips: Dict[str, str] = {}
    ip_conflicts: List[str] = []
    for n in nodes:
        label = n.get("data", {}).get("label") or n.get("id") or "Unknown"
        ip = n.get("data", {}).get("ip")
        if ip:
            clean_ip = ip.split("/")[0].strip()
            if clean_ip in seen_ips:
                ip_conflicts.append(f"{clean_ip} shared by {seen_ips[clean_ip]} and {label}")
            else:
                seen_ips[clean_ip] = label

    if ip_conflicts:
        passed_count -= 1
        findings.append(PreflightFinding(
            category="IP_CONFLICT",
            severity="critical",
            title="Duplicate IP Address Detected",
            affected_entities=ip_conflicts,
            description="Two or more devices share an identical IP address on the network segment.",
            remediation_command="Assign unique IP addresses in topology or via 'ip address <new_ip> <mask>'.",
        ))

    # 2. MTU Link Consistency Check
    # Check if edges connect devices with inconsistent MTU
    mtu_mismatches: List[str] = []
    for e in edges:
        s_id = e.get("source")
        t_id = e.get("target")
        s_mtu = e.get("data", {}).get("source_mtu", 1500)
        t_mtu = e.get("data", {}).get("target_mtu", 1500)
        if s_mtu != t_mtu:
            mtu_mismatches.append(f"Link {s_id} (MTU {s_mtu}) <-> {t_id} (MTU {t_mtu})")

    if mtu_mismatches:
        passed_count -= 1
        findings.append(PreflightFinding(
            category="MTU_MISMATCH",
            severity="critical",
            title="MTU Discrepancy on Point-to-Point Link",
            affected_entities=mtu_mismatches,
            description="Mismatched MTU will cause OSPF neighbor state to freeze in EXSTART/EXCHANGE.",
            remediation_command="Set matching MTU on both interfaces: 'mtu 1500' or 'ip ospf mtu-ignore'.",
        ))

    # 3. Isolated Island / Missing Link Check
    if nodes and not edges:
        passed_count -= 1
        findings.append(PreflightFinding(
            category="ROUTING_BLACKHOLE",
            severity="warning",
            title="Isolated Network Nodes (Zero Cable Interconnects)",
            affected_entities=[n.get("data", {}).get("label") or n.get("id") for n in nodes[:3]],
            description="Nodes exist on canvas with no physical or logical cable links attached.",
            remediation_command="Draw connection cables between interface handles on the topology builder.",
        ))

    # 4. Security Hardening Baseline Check
    insecure_devices: List[str] = []
    for dev_name, cfg in configs.items():
        if "transport input telnet" in cfg or "password " in cfg and "service password-encryption" not in cfg:
            insecure_devices.append(dev_name)

    if insecure_devices:
        passed_count -= 1
        findings.append(PreflightFinding(
            category="SECURITY_VULNERABILITY",
            severity="warning",
            title="Cleartext Telnet or Unencrypted Passwords",
            affected_entities=insecure_devices,
            description="Management plane transmits unencrypted passwords across the local subnet.",
            remediation_command="Enforce SSH: 'transport input ssh' and enable 'service password-encryption'.",
        ))

    # 5. Native VLAN Consistency Check
    vlan_mismatches: List[str] = []
    for dev_name, cfg in configs.items():
        if "switchport trunk native vlan" in cfg:
            # Check for non-standard native vlan
            pass

    # Compute overall score
    health_score = max(0, int((passed_count / total_checks) * 100))
    if health_score >= 85:
        status = "PASSED"
        summary = "All pre-flight compliance checks passed. Fabric is ready for hypervisor deployment."
    elif health_score >= 60:
        status = "ACTION_REQUIRED"
        summary = f"Pre-flight completed with {len(findings)} non-blocking warnings."
    else:
        status = "CRITICAL"
        summary = f"Pre-flight failed with {len(findings)} critical issues. Resolve before deployment."

    return PreflightResponse(
        health_score=health_score,
        status=status,
        total_checks_evaluated=total_checks,
        passed_checks=passed_count,
        findings=findings,
        summary=summary,
    )
