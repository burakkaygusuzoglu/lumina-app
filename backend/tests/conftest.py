"""
Lumina Life OS — Test Configuration
Shared fixtures and test client setup.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Return a test client that does NOT start a real server."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Return dummy auth headers (JWT validation is mocked at integration level).
    For unit tests that check header injection / no-auth rejection we send
    a clearly invalid token so we can assert on 401 without hitting Supabase."""
    return {"Authorization": "Bearer INVALID_TOKEN_FOR_TESTING"}
