"""Practical Examinations, Assessments, and Interview Simulator Endpoints."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.ai_providers.manager import ai_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessments", tags=["Assessments & Exams"])


class Question(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: int
    explanation: str
    category: str


class AssessmentEvaluationRequest(BaseModel):
    assessment_id: str
    answers: Dict[int, int]  # question_id -> selected_option_index


class AssessmentEvaluationResponse(BaseModel):
    score_percent: float
    total_questions: int
    correct_count: int
    passed: bool
    review: List[Dict[str, Any]]
    feedback: str


class InterviewQuestion(BaseModel):
    id: int
    category: str
    question: str
    model_answer: str
    difficulty: str


@router.get("/questions", response_model=List[Question])
async def get_practice_questions():
    """Return CCNA/CCNP practice examination questions."""
    return [
        Question(
            id=1,
            question="Which OSPF packet type is responsible for establishing and maintaining neighbor relationships?",
            options=["Type 1 (Hello)", "Type 2 (DBD)", "Type 3 (LSR)", "Type 4 (LSU)"],
            correct_answer=0,
            explanation="Hello packets (Type 1) discover and maintain bidirectional neighbor adjacencies on the link.",
            category="Routing",
        ),
        Question(
            id=2,
            question="What is the default Administrative Distance (AD) of an internal EIGRP route?",
            options=["90", "110", "120", "170"],
            correct_answer=0,
            explanation="Internal EIGRP has an AD of 90; external EIGRP has an AD of 170; OSPF is 110; RIP is 120.",
            category="Routing",
        ),
        Question(
            id=3,
            question="Which standard 802.1Q field carries the 12-bit VLAN identifier?",
            options=["Tag Protocol Identifier (TPID)", "VLAN ID (VID)", "Priority Code Point (PCP)", "Drop Eligible Indicator (DEI)"],
            correct_answer=1,
            explanation="The 12-bit VID field identifies the VLAN, supporting IDs from 1 to 4094.",
            category="Switching",
        ),
    ]


@router.get("/interview/questions", response_model=List[InterviewQuestion])
async def get_interview_questions():
    """Return technical network engineer interview questions."""
    return [
        InterviewQuestion(
            id=1,
            category="Architecture",
            question="Walk me through what happens at the packet and frame level when a client computer opens a webpage by typing 'www.example.com'.",
            model_answer="1. DNS Resolution (ARP for default gateway if cache empty -> ICMP/UDP 53 query -> DNS response with IP). 2. TCP 3-way handshake (SYN, SYN-ACK, ACK). 3. TLS 1.3 Client Hello / Handshake. 4. HTTP GET Request over encrypted tunnel. 5. HTTP 200 OK + Payload. 6. TCP Teardown.",
            difficulty="Senior",
        ),
        InterviewQuestion(
            id=2,
            category="Troubleshooting",
            question="Two OSPF routers are directly connected via GigabitEthernet, but their adjacency is stuck in 2-WAY state. What is the most probable cause?",
            model_answer="Both routers are configured with 'ip ospf priority 0' or are DROTHERs on a broadcast multi-access network (meaning neither can become DR or BDR). In broadcast networks, DROTHERs stay in 2-WAY with other DROTHERs.",
            difficulty="Mid-Senior",
        ),
    ]


@router.post("/evaluate", response_model=AssessmentEvaluationResponse)
async def evaluate_assessment(req: AssessmentEvaluationRequest):
    """Evaluate submitted exam answers and compute score."""
    total = 3
    correct = sum(1 for qid, ans in req.answers.items() if (qid == 1 and ans == 0) or (qid == 2 and ans == 0) or (qid == 3 and ans == 1))
    score = round((correct / total) * 100, 1)

    return AssessmentEvaluationResponse(
        score_percent=score,
        total_questions=total,
        correct_count=correct,
        passed=score >= 75.0,
        review=[
            {"question_id": 1, "is_correct": req.answers.get(1) == 0},
            {"question_id": 2, "is_correct": req.answers.get(2) == 0},
            {"question_id": 3, "is_correct": req.answers.get(3) == 1},
        ],
        feedback="Great work! You demonstrated solid understanding of routing protocols and Layer 2 encapsulation." if score >= 75 else "Review OSPF packet types and default administrative distances.",
    )


class LabGradingRequest(BaseModel):
    lab_id: Optional[str] = "ccna-ospf-01"
    task_title: str = "Enterprise OSPF & Interface Hardening Lab"
    device_name: str = "R1-Core"
    config_text: str
    target_objectives: Optional[List[str]] = None


class ObjectiveEvaluation(BaseModel):
    title: str
    passed: bool
    points_awarded: int
    points_possible: int
    details: str
    recommendation: Optional[str] = None


class LabGradingResponse(BaseModel):
    task_title: str
    device_name: str
    score_percent: float
    total_score: int
    max_score: int
    passed: bool
    evaluation_breakdown: List[ObjectiveEvaluation]
    summary_feedback: str


@router.post("/grade-lab", response_model=LabGradingResponse)
async def grade_lab_submission(req: LabGradingRequest):
    """Automatically evaluate and grade a student's running configuration against lab objectives."""
    config = req.config_text
    lines = [line.strip() for line in config.splitlines() if line.strip() and not line.strip().startswith("!")]

    objectives: List[ObjectiveEvaluation] = []

    # Check 1: Hostname Configured
    has_hostname = any(l.startswith("hostname ") and len(l.split()) > 1 for l in lines)
    objectives.append(ObjectiveEvaluation(
        title="1. Device Identification & Hostname",
        passed=has_hostname,
        points_awarded=20 if has_hostname else 0,
        points_possible=20,
        details="Standard hostname command present." if has_hostname else "Missing valid 'hostname <name>' command.",
        recommendation=None if has_hostname else "Configure a descriptive hostname using 'hostname R1-Core'.",
    ))

    # Check 2: Interface IP and Activation
    has_ip = any("ip address" in l for l in lines)
    has_no_shut = any("no shutdown" in l for l in lines)
    iface_ok = has_ip and has_no_shut
    objectives.append(ObjectiveEvaluation(
        title="2. Interface Layer 3 Addressing & Up State",
        passed=iface_ok,
        points_awarded=20 if iface_ok else (10 if has_ip else 0),
        points_possible=20,
        details="IP address assigned and 'no shutdown' enabled." if iface_ok else ("IP assigned but interface may remain administratively down." if has_ip else "No IP address assigned."),
        recommendation=None if iface_ok else "Ensure interfaces have 'ip address <ip> <mask>' and 'no shutdown'.",
    ))

    # Check 3: OSPF Routing Process
    has_ospf = any(l.startswith("router ospf") for l in lines)
    has_ospf_net = any("network " in l and "area" in l for l in lines)
    has_router_id = any(l.startswith("router-id") for l in lines)
    ospf_ok = has_ospf and (has_ospf_net or has_router_id)
    objectives.append(ObjectiveEvaluation(
        title="3. OSPFv2 Routing Protocol Configuration",
        passed=ospf_ok,
        points_awarded=20 if ospf_ok else (10 if has_ospf else 0),
        points_possible=20,
        details="OSPF process active with area advertisement / router-id." if ospf_ok else "OSPF process incomplete or missing network statements.",
        recommendation=None if ospf_ok else "Configure 'router ospf 1', 'router-id <id>', and 'network <prefix> <wildcard> area 0'.",
    ))

    # Check 4: Default Routing or Edge Gateway
    has_default_route = any("ip route 0.0.0.0 0.0.0.0" in l or "default-information originate" in l for l in lines)
    objectives.append(ObjectiveEvaluation(
        title="4. Gateway & Default Route Propagation",
        passed=has_default_route,
        points_awarded=20 if has_default_route else 0,
        points_possible=20,
        details="Default static route or OSPF default-information originate is configured." if has_default_route else "No default static route or default-information originate found.",
        recommendation=None if has_default_route else "Add 'ip route 0.0.0.0 0.0.0.0 <next-hop>' or 'default-information originate' under OSPF.",
    ))

    # Check 5: Security & Management Hardening
    has_sec = any("transport input ssh" in l or "service password-encryption" in l or "secret" in l for l in lines)
    objectives.append(ObjectiveEvaluation(
        title="5. Management Plane Security (SSH / Password Encryption)",
        passed=has_sec,
        points_awarded=20 if has_sec else 0,
        points_possible=20,
        details="Management security controls (SSH / password encryption) present." if has_sec else "Vulnerable to cleartext telnet/passwords.",
        recommendation=None if has_sec else "Enable 'service password-encryption' and 'transport input ssh' under line vty 0 4.",
    ))

    total_score = sum(o.points_awarded for o in objectives)
    max_score = sum(o.points_possible for o in objectives)
    pct = round((total_score / max_score) * 100, 1)
    passed = pct >= 70.0

    summary = (
        f"Lab Assessment Complete. Score: {pct}%. Status: {'PASSED (Meets Cisco CCNA Standard)' if passed else 'RETAKE RECOMMENDED'}. "
        f"Completed {sum(1 for o in objectives if o.passed)} of {len(objectives)} criteria."
    )

    return LabGradingResponse(
        task_title=req.task_title,
        device_name=req.device_name,
        score_percent=pct,
        total_score=total_score,
        max_score=max_score,
        passed=passed,
        evaluation_breakdown=objectives,
        summary_feedback=summary,
    )

