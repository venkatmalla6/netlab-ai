"""Pytest configuration and async test fixtures for NETLAB AI."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, AsyncGenerator, cast

# Ensure pure Python execution to prevent Windows AppLocker blocks on Cython modules
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"
os.environ["APP_ENV"] = "test"

# Ensure backend root directory is always on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from httpx import ASGITransport, AsyncClient

import app.models  # noqa: F401 - ensure all ORM models registered
from app.core.database import init_db
from app.main import app as fastapi_app


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async test client connected to the FastAPI application with initialized DB."""
    await init_db()
    transport = ASGITransport(app=cast(Any, fastapi_app))
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
