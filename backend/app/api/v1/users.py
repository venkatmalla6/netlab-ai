"""Local User Profile & Roles Endpoints (Localhost Single-User Mode)."""

from __future__ import annotations

from typing import List
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_active: bool
    permissions: List[str]


@router.get("/me", response_model=UserProfile)
async def get_current_user():
    """Return local administrative user profile."""
    return UserProfile(
        id="usr-local-admin",
        username="admin",
        email="admin@netlab.local",
        role="Super Admin",
        is_active=True,
        permissions=[
            "labs:manage",
            "devices:configure",
            "devices:execute",
            "eve_ng:admin",
            "vmware:admin",
            "ai:full_access",
            "settings:edit",
        ],
    )

