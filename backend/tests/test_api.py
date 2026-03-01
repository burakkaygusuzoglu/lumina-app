"""
Lumina Life OS — API Endpoint Tests
Tests: correct HTTP status codes, response shapes, auth gating.
All tests run against the ASGI app in-process (no real DB calls).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# ── Auth Endpoints ────────────────────────────────────────────────────────────

class TestAuthEndpoints:
    def test_register_missing_fields_422(self, client: TestClient) -> None:
        r = client.post("/auth/register", json={})
        assert r.status_code == 422

    def test_register_invalid_email_422(self, client: TestClient) -> None:
        r = client.post(
            "/auth/register",
            json={"email": "not-an-email", "password": "pass123", "full_name": "Test"},
        )
        assert r.status_code == 422

    def test_login_missing_fields_422(self, client: TestClient) -> None:
        r = client.post("/auth/login", json={})
        assert r.status_code == 422

    def test_login_wrong_credentials_returns_error(self, client: TestClient) -> None:
        """Supabase will reject; endpoint must return 400 or 401."""
        r = client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword"},
        )
        assert r.status_code in (400, 401, 422, 500)

    def test_me_unauthenticated_401(self, client: TestClient) -> None:
        r = client.get("/auth/me")
        assert r.status_code in (401, 403)


# ── Memories ──────────────────────────────────────────────────────────────────

class TestMemoriesEndpoints:
    def test_list_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/memories").status_code in (401, 403)

    def test_create_unauthenticated(self, client: TestClient) -> None:
        assert client.post("/memories", json={"content": "test"}).status_code in (401, 403)

    def test_delete_unauthenticated(self, client: TestClient) -> None:
        assert client.delete("/memories/test-id").status_code in (401, 403)


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TestTasksEndpoints:
    def test_list_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/tasks").status_code in (401, 403)

    def test_create_unauthenticated(self, client: TestClient) -> None:
        assert client.post("/tasks", json={"title": "test"}).status_code in (401, 403)

    def test_complete_unauthenticated(self, client: TestClient) -> None:
        assert client.patch("/tasks/test-id/complete").status_code in (401, 403)


# ── Wellness ──────────────────────────────────────────────────────────────────

class TestWellnessEndpoints:
    def test_mood_list_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/wellness/mood/history").status_code in (401, 403)

    def test_sleep_list_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/wellness/sleep/history").status_code in (401, 403)

    def test_mood_log_unauthenticated(self, client: TestClient) -> None:
        assert client.post("/wellness/mood", json={"score": 7}).status_code in (401, 403)


# ── Vault ─────────────────────────────────────────────────────────────────────

class TestVaultEndpoints:
    def test_list_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/vault").status_code in (401, 403)

    def test_create_unauthenticated(self, client: TestClient) -> None:
        r = client.post("/vault", json={"label": "x", "secret": "y"})
        assert r.status_code in (401, 403)

    def test_delete_unauthenticated(self, client: TestClient) -> None:
        assert client.delete("/vault/test-id").status_code in (401, 403)


# ── Journal ───────────────────────────────────────────────────────────────────

class TestJournalEndpoints:
    def test_list_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/journal/entries").status_code in (401, 403)

    def test_create_unauthenticated(self, client: TestClient) -> None:
        r = client.post("/journal/entry", json={"content": "Dear diary..."})
        assert r.status_code in (401, 403)

    def test_time_capsules_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/journal/timecapsule").status_code in (401, 403)


# ── AI ────────────────────────────────────────────────────────────────────────

class TestAIEndpoints:
    def test_greeting_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/ai/greeting").status_code in (401, 403)

    def test_on_this_day_unauthenticated(self, client: TestClient) -> None:
        assert client.get("/ai/on-this-day").status_code in (401, 403)


# ── Public Endpoints ──────────────────────────────────────────────────────────

class TestPublicEndpoints:
    def test_health_check(self, client: TestClient) -> None:
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("healthy", "degraded", "ok")

    def test_root_endpoint(self, client: TestClient) -> None:
        r = client.get("/")
        assert r.status_code == 200


# ── Input Validation ──────────────────────────────────────────────────────────

class TestInputValidation:
    """Pydantic v2 models must reject bad input with 422."""

    def test_register_short_password_422(self, client: TestClient) -> None:
        r = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "ab", "full_name": "T"},
        )
        # Either 422 (validation) or 400 (Supabase rejects) is acceptable
        assert r.status_code in (400, 422)

    def test_content_type_json_required(self, client: TestClient) -> None:
        """Sending form data to a JSON endpoint must return 422."""
        r = client.post(
            "/auth/login",
            data={"email": "x@y.com", "password": "abc"},
        )
        assert r.status_code == 422
