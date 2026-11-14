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
