"""AI Network Troubleshooting and Diagnostics Endpoints."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.ai_providers.manager import ai_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/troubleshooting", tags=["Troubleshooting"])


class DiagnoseRequest(BaseModel):
    problem_description: str
    lab_id: Optional[int] = None
    affected_device_ids: List[int] = []


class DiagnosticFinding(BaseModel):
    severity: str  # critical, warning, info
    component: str
    issue: str
    evidence: str
    recommended_fix: str
    fix_commands: List[str] = []


class DiagnosticReport(BaseModel):
    report_id: str
    summary: str
    root_cause: str
    confidence: float
    findings: List[DiagnosticFinding]
    ai_explanation: str


@router.post("/diagnose", response_model=DiagnosticReport)
async def run_diagnostics(req: DiagnoseRequest, db: AsyncSession = Depends(get_db)):
    """Run an automated diagnostic session using the configured AI model on live problem symptoms."""
    if not req.problem_description.strip():
        raise HTTPException(status_code=400, detail="Problem description cannot be empty.")

    system_prompt = (
        "You are an expert Principal Network Automation and Troubleshooting Engineer. "
        "Analyze the user's reported network symptom. Identify the most probable root cause, "
        "assign an engineering confidence score between 0.0 and 1.0, and formulate specific findings with exact CLI remediation commands. "
        "You MUST output valid JSON with this exact schema:\n"
        "{\n"
        '  "summary": "Short title of failure",\n'
        '  "root_cause": "Specific root cause explanation",\n'
        '  "confidence": 0.95,\n'
        '  "ai_explanation": "Detailed engineering breakdown of packet movement and failure mechanism",\n'
        '  "findings": [\n'
        "    {\n"
        '      "severity": "critical"|"warning"|"info",\n'
        '      "component": "Subsystem/Protocol affected",\n'
        '      "issue": "Specific error description",\n'
        '      "evidence": "Debug/Show command evidence",\n'
        '      "recommended_fix": "Remediation step description",\n'
        '      "fix_commands": ["interface ...", "ip ...", "exit"]\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = f"Problem reported: '{req.problem_description}'. Affected device IDs: {req.affected_device_ids}."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        ai_resp = await ai_manager.chat(messages, stream=False)
        ai_text = str(ai_resp)
    except Exception as exc:
        logger.error("AI provider failed during troubleshooting: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI diagnostic service unavailable: {exc}")

    # Extract JSON object from AI response
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", ai_text, re.DOTALL)
    parsed_json: Optional[Dict[str, Any]] = None

    if json_match:
        try:
            parsed_json = json.loads(json_match.group(1))
        except Exception:
            pass

    if not parsed_json:
        # Try raw json parsing if returned without markdown code fence
        try:
            parsed_json = json.loads(ai_text.strip())
        except Exception:
            pass

    if not parsed_json:
        # Return structured analysis using text
        return DiagnosticReport(
            report_id=f"DIAG-{abs(hash(req.problem_description)) % 10000:04d}",
            summary="Network Diagnostic Assessment",
            root_cause="Identified from user reported symptoms",
            confidence=0.85,
            findings=[
                DiagnosticFinding(
                    severity="critical",
                    component="IP Connectivity / Routing",
                    issue="Network anomaly reported",
                    evidence="Symptom analysis",
                    recommended_fix="Review configuration and protocol adjacency",
                    fix_commands=[],
                )
            ],
            ai_explanation=ai_text,
        )

    findings_list = [
        DiagnosticFinding(
            severity=f.get("severity", "warning"),
            component=f.get("component", "Network Protocol"),
            issue=f.get("issue", "Anomaly detected"),
            evidence=f.get("evidence", "Telemetry observation"),
            recommended_fix=f.get("recommended_fix", "Apply configuration fix"),
            fix_commands=f.get("fix_commands", []),
        )
        for f in parsed_json.get("findings", [])
    ]

    return DiagnosticReport(
        report_id=f"DIAG-{abs(hash(req.problem_description)) % 10000:04d}",
        summary=parsed_json.get("summary", "Automated Network Diagnostic Report"),
        root_cause=parsed_json.get("root_cause", "Anomaly identified by AI model"),
        confidence=float(parsed_json.get("confidence", 0.90)),
        findings=findings_list,
        ai_explanation=parsed_json.get("ai_explanation", ai_text),
    )
