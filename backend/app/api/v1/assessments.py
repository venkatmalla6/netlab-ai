"""Practical Examinations, Assessments, and Interview Simulator Endpoints."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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

