"""Network Security Analyzer – audits actual network device configurations."""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.configuration import Configuration
from app.models.device import Device

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/security", tags=["Security Analyzer"])


class SecurityAuditRequest(BaseModel):
    device_id: Optional[int] = None
    config_text: Optional[str] = None


class SecurityIssue(BaseModel):
    severity: str  # critical, high, medium, low
    category: str
    rule_id: str
    title: str
    description: str
    recommendation: str
    remediation_command: str


class SecurityAuditReport(BaseModel):
    device_id: Optional[int]
    overall_score: int  # 0-100
    risk_level: str  # Low, Moderate, High, Critical
    total_issues: int
    issues: List[SecurityIssue]
    passed_checks: List[str]


@router.post("/audit", response_model=SecurityAuditReport)
async def audit_device_security(
    req: SecurityAuditRequest,
    db: AsyncSession = Depends(get_db)
):
    """Run an automated security audit on actual device configuration text."""
    text_to_audit = req.config_text

    if not text_to_audit and req.device_id:
        stmt = select(Configuration).where(Configuration.device_id == req.device_id).order_by(Configuration.version.desc()).limit(1)
        res = await db.execute(stmt)
        config_record = res.scalar_one_or_none()
        if config_record:
            text_to_audit = config_record.config_text

    if not text_to_audit or not text_to_audit.strip():
        raise HTTPException(
            status_code=400,
            detail="No configuration text provided and no configuration exists in database for this device.",
        )

    config_lower = text_to_audit.lower()
    issues: List[SecurityIssue] = []
    passed: List[str] = []

    # Rule 1: Telnet check
    if "transport input telnet" in config_lower or ("line vty" in config_lower and "transport input ssh" not in config_lower):
        issues.append(
            SecurityIssue(
                severity="high",
                category="Management Plane",
                rule_id="SEC-001",
                title="Unencrypted Telnet Management Enabled",
                description="Configuration allows cleartext Telnet on VTY terminal lines.",
                recommendation="Disable Telnet and enforce SSH version 2.",
                remediation_command="line vty 0 4\n transport input ssh\n ip ssh version 2",
            )
        )
    else:
        passed.append("VTY terminal lines restrict transport to secure protocols (SSH).")

    # Rule 2: Service password encryption
    if "service password-encryption" not in config_lower:
        issues.append(
            SecurityIssue(
                severity="medium",
                category="Credential Storage",
                rule_id="SEC-002",
                title="Service Password-Encryption Disabled",
                description="Plaintext passwords stored without Cisco reversible Type 7 obfuscation.",
                recommendation="Enable service password-encryption globally.",
                remediation_command="service password-encryption",
            )
        )
    else:
        passed.append("Service password-encryption is enabled globally.")

    # Rule 3: Enable Secret configured
    if "enable secret" not in config_lower:
        issues.append(
            SecurityIssue(
                severity="high",
                category="Authentication",
                rule_id="SEC-003",
                title="Missing Strong Enable Secret",
                description="Privileged EXEC access is unprotected or using legacy weak 'enable password'.",
                recommendation="Configure an enable secret using modern hashing.",
                remediation_command="enable secret 9 <secret-string>",
            )
        )
    else:
        passed.append("Enable secret is configured with secure cryptographic hashing.")

    # Rule 4: Weak SNMP community strings
    if "snmp-server community public" in config_lower or "snmp-server community private" in config_lower:
        issues.append(
            SecurityIssue(
                severity="high",
                category="Management Plane",
                rule_id="SEC-004",
                title="Default / Weak SNMP Community Strings Detected",
                description="Configuration uses default community strings 'public' or 'private'.",
                recommendation="Remove default community strings and migrate to SNMPv3 with auth and priv.",
                remediation_command="no snmp-server community public\nno snmp-server community private",
            )
        )
    elif "snmp-server" in config_lower:
        passed.append("No default SNMP community strings ('public'/'private') detected.")

    # Rule 5: Login banner
    if "banner motd" not in config_lower and "banner login" not in config_lower:
        issues.append(
            SecurityIssue(
                severity="low",
                category="Legal Compliance",
                rule_id="SEC-005",
                title="Missing Login / MOTD Warning Banner",
                description="No legal unauthorized access warning banner configured.",
                recommendation="Configure banner motd with formal unauthorized access advisory.",
                remediation_command='banner motd ^C Authorized Access Only. All activities are logged. ^C',
            )
        )
    else:
        passed.append("Legal warning login banner (MOTD) is active.")

    # Rule 6: OSPF Authentication
    if "router ospf" in config_lower and "message-digest-key" not in config_lower and "authentication message-digest" not in config_lower:
        issues.append(
            SecurityIssue(
                severity="medium",
                category="Control Plane",
                rule_id="SEC-006",
                title="OSPF Routing Protocol Lacks Cryptographic Authentication",
                description="OSPF Area updates are transmitted without MD5/SHA authentication.",
                recommendation="Enable MD5 neighbor authentication on OSPF interfaces and area.",
                remediation_command="interface GigabitEthernet0/0\n ip ospf message-digest-key 1 md5 <key>\nrouter ospf 1\n area 0 authentication message-digest",
            )
        )
    elif "router ospf" in config_lower:
        passed.append("OSPF area neighbor authentication is active.")

    # Calculate real score
    deductions = {"high": 25, "medium": 15, "low": 5}
    total_deduction = sum(deductions.get(i.severity, 10) for i in issues)
    score = max(0, 100 - total_deduction)

    risk_level = "Low" if score >= 85 else "Moderate" if score >= 65 else "High" if score >= 40 else "Critical"

    return SecurityAuditReport(
        device_id=req.device_id,
        overall_score=score,
        risk_level=risk_level,
        total_issues=len(issues),
        issues=issues,
        passed_checks=passed,
    )
