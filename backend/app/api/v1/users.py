"""Role-Based Access Control (RBAC) and Multi-User Management Endpoints."""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/users", tags=["Users"])


class UserProfile(BaseModel):
    id: str
    username: str
    full_name: str
    email: str
    role: str  # Super Admin, Network Architect, NOC Engineer, Student / Auditor
    is_active: bool = True
    permissions: List[str]


class UserCreateRequest(BaseModel):
    username: str
    full_name: str
    email: str
    role: str = "NOC Engineer"
    permissions: Optional[List[str]] = None


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None


ROLE_DEFAULT_PERMISSIONS = {
    "Super Admin": [
        "labs:manage",
        "devices:configure",
        "devices:execute",
        "eve_ng:admin",
        "vmware:admin",
        "ai:full_access",
        "settings:edit",
        "users:manage",
    ],
    "Network Architect": [
        "labs:manage",
        "devices:configure",
        "devices:execute",
        "ai:full_access",
        "topologies:export",
    ],
    "NOC Engineer": [
        "devices:monitor",
        "devices:execute:assisted",
        "troubleshooting:diagnose",
        "packets:analyze",
    ],
    "Student / Auditor": [
        "learning:access",
        "assessments:take",
        "devices:terminal:read",
        "reports:view",
    ],
}

# In-memory persistent enterprise accounts table
ACCOUNTS_DB: List[UserProfile] = [
    UserProfile(
        id="usr-01",
        username="admin",
        full_name="Enterprise Super Administrator",
        email="admin@netlab.local",
        role="Super Admin",
        is_active=True,
        permissions=ROLE_DEFAULT_PERMISSIONS["Super Admin"],
    ),
    UserProfile(
        id="usr-02",
        username="sarah.chen",
        full_name="Sarah Chen (Lead Architect)",
        email="s.chen@netlab.local",
        role="Network Architect",
        is_active=True,
        permissions=ROLE_DEFAULT_PERMISSIONS["Network Architect"],
    ),
    UserProfile(
        id="usr-03",
        username="marcus.vance",
        full_name="Marcus Vance (NOC Lead)",
        email="m.vance@netlab.local",
        role="NOC Engineer",
        is_active=True,
        permissions=ROLE_DEFAULT_PERMISSIONS["NOC Engineer"],
    ),
    UserProfile(
        id="usr-04",
        username="alex.student",
        full_name="Alex Rivera (CCNA Candidate)",
        email="a.rivera@netlab.local",
        role="Student / Auditor",
        is_active=True,
        permissions=ROLE_DEFAULT_PERMISSIONS["Student / Auditor"],
    ),
]


@router.get("/me", response_model=UserProfile)
async def get_current_user():
    """Return local active user profile."""
    return ACCOUNTS_DB[0]


@router.get("", response_model=List[UserProfile])
async def list_users():
    """List all enterprise accounts with their assigned roles and permissions."""
    return ACCOUNTS_DB


@router.post("", response_model=UserProfile, status_code=201)
async def create_user(body: UserCreateRequest):
    """Create a new user account with assigned RBAC role."""
    # Check duplicate username
    if any(u.username.lower() == body.username.lower() for u in ACCOUNTS_DB):
        raise HTTPException(status_code=400, detail="Username already exists.")

    perms = body.permissions or ROLE_DEFAULT_PERMISSIONS.get(body.role, ROLE_DEFAULT_PERMISSIONS["NOC Engineer"])
    new_user = UserProfile(
        id=f"usr-{len(ACCOUNTS_DB) + 1:02d}",
        username=body.username.lower().strip(),
        full_name=body.full_name.strip(),
        email=body.email.lower().strip(),
        role=body.role,
        is_active=True,
        permissions=perms,
    )
    ACCOUNTS_DB.append(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, body: UserUpdateRequest):
    """Update user role, status, or permissions."""
    user = next((u for u in ACCOUNTS_DB if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = body.role
        user.permissions = body.permissions or ROLE_DEFAULT_PERMISSIONS.get(body.role, user.permissions)
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.permissions is not None:
        user.permissions = body.permissions

    return user


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Remove user account from system."""
    if user_id == "usr-01":
        raise HTTPException(status_code=403, detail="Cannot delete default Super Administrator account.")

    idx = next((i for i, u in enumerate(ACCOUNTS_DB) if u.id == user_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="User not found.")

    deleted = ACCOUNTS_DB.pop(idx)
    return {"message": f"User '{deleted.username}' deleted successfully.", "success": True}
