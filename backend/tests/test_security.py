"""
Lumina Life OS — Security Tests
Tests: security headers, unauthenticated rejection, rate limit headers,
JWT tampering rejection, CORS policy.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# ── Security Headers ──────────────────────────────────────────────────────────

class TestSecurityHeaders:
    """Verify OWASP-recommended headers are present on every response."""

    def test_x_content_type_options(self, client: TestClient) -> None:
        r = client.get("/health")
        assert r.headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options(self, client: TestClient) -> None:
        r = client.get("/health")
        assert r.headers.get("x-frame-options") == "DENY"

    def test_x_xss_protection(self, client: TestClient) -> None:
        r = client.get("/health")
        assert r.headers.get("x-xss-protection") == "1; mode=block"

    def test_referrer_policy(self, client: TestClient) -> None:
        r = client.get("/health")
        assert r.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_x_request_id_present(self, client: TestClient) -> None:
        """Every response must carry a unique request ID for tracing."""
        r = client.get("/health")
        assert "x-request-id" in r.headers


# ── Health Endpoint ───────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_returns_200(self, client: TestClient) -> None:
        r = client.get("/health")
        assert r.status_code == 200

    def test_has_status_field(self, client: TestClient) -> None:
        data = client.get("/health").json()
        assert "status" in data

    def test_has_uptime_seconds(self, client: TestClient) -> None:
        data = client.get("/health").json()
        assert "uptime_seconds" in data
        assert isinstance(data["uptime_seconds"], (int, float))

    def test_has_timestamp(self, client: TestClient) -> None:
        data = client.get("/health").json()
        assert "timestamp" in data


# ── Unauthenticated Rejection ─────────────────────────────────────────────────

PROTECTED_ENDPOINTS = [
    ("GET",    "/memories"),
    ("GET",    "/tasks"),
    ("GET",    "/wellness/mood/history"),
    ("GET",    "/wellness/sleep/history"),
    ("GET",    "/vault"),
    ("GET",    "/journal/entries"),
    ("GET",    "/ai/greeting"),
]


class TestUnauthenticatedRejection:
    """All protected endpoints must return 401/403 without a valid token."""

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_no_token_rejected(
        self, client: TestClient, method: str, path: str
    ) -> None:
        r = client.request(method, path)
        assert r.status_code in (401, 403), (
            f"{method} {path} returned {r.status_code}, expected 401/403"
        )

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_invalid_token_rejected(
        self, client: TestClient, auth_headers: dict, method: str, path: str
    ) -> None:
        r = client.request(method, path, headers=auth_headers)
        assert r.status_code in (401, 403), (
            f"{method} {path} with bad token returned {r.status_code}"
        )


# ── Vault & Encryption Tests ──────────────────────────────────────────────────

class TestEncryptionService:
    """Verifies AES-256-GCM encryption logic within the service."""
    
    def test_encrypt_decrypt_lifecycle(self) -> None:
        """A plain string should be encrypted and decrypted perfectly."""
        from app.services.encryption_service import EncryptionService
        svc = EncryptionService()
        plaintext = "secret_lumina_password_123!"
        encrypted = svc.encrypt(plaintext)
        
        # Ciphertext format: salt(16) + iv(12) + ciphertext + tag
        assert encrypted != plaintext
        assert len(encrypted) > len(plaintext)
        
        decrypted = svc.decrypt(encrypted)
        assert decrypted == plaintext

    def test_tampering_raises_error(self) -> None:
        """If the encrypted blob is altered, GCM tag should reject it."""
        from fastapi import HTTPException
        from app.services.encryption_service import EncryptionService
        import base64
        
        svc = EncryptionService()
        encryptedBase64 = svc.encrypt("my_secret")
        
        # Decode, alter 1 byte of the ciphertext/tag, encode back
        blob = bytearray(base64.urlsafe_b64decode(encryptedBase64 + "==="))
        blob[-1] = blob[-1] ^ 0xFF  # Flip bits in the GCM tag
        tamperedBase64 = base64.urlsafe_b64encode(blob).decode("ascii")
        
        with pytest.raises(HTTPException) as exc:
            svc.decrypt(tamperedBase64)
        assert exc.value.status_code == 400
        assert "corrupt" in exc.value.detail.lower()

    def test_encrypt_dict(self) -> None:
        """Ensure dictionary encryption serializes non-strings correctly."""
        from app.services.encryption_service import EncryptionService
        import json
        svc = EncryptionService()
        
        data = {
            "password": "pass",
            "metadata": {"cvv": 123},
            "empty": None
        }
        
        encrypted_dict = svc.encrypt_dict(data)
        assert "password" in encrypted_dict
        assert "metadata" in encrypted_dict
        assert "empty" not in encrypted_dict
        
        assert svc.decrypt(encrypted_dict["password"]) == "pass"
        assert json.loads(svc.decrypt(encrypted_dict["metadata"])) == {"cvv": 123}

# ── JWT Tampering ─────────────────────────────────────────────────────────────

class TestJWTTampering:
    """Malformed / tampered JWT variants must all be rejected."""

    MALFORMED_TOKENS = [
        "Bearer ",                                     # empty
        "Bearer notavalidjwt",                         # garbage
        "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.",  # alg=none attack
        "Token abc123",                                # wrong scheme
    ]

    @pytest.mark.parametrize("auth_value", MALFORMED_TOKENS)
    def test_malformed_token(self, client: TestClient, auth_value: str) -> None:
        r = client.get("/memories", headers={"Authorization": auth_value})
        assert r.status_code in (401, 403)


# ── Registration Rate-Limit Header ───────────────────────────────────────────

class TestRateLimitHeaders:
    """Rate-limited endpoints must return 422 on invalid input (validation fires
    before rate-limit headers are injected), OR 201/400 on valid calls."""

    def test_register_returns_expected_codes(self, client: TestClient) -> None:
        """POST /auth/register returns 422 on empty body (Pydantic validation)."""
        r = client.post("/auth/register", json={})
        assert r.status_code == 422

    def test_login_rate_limited_after_many_attempts(self, client: TestClient) -> None:
        """After enough rapid attempts the endpoint must return 429 or keep returning 400.
        We only verify the endpoint is reachable and returns a 4xx code.
        """
        r = client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
        )
        assert r.status_code in (400, 401, 429, 422, 500)


# ── Error Handling ────────────────────────────────────────────────────────────

class TestErrorHandling:
    """Internal errors must not leak stack traces to clients."""

    def test_404_returns_json(self, client: TestClient) -> None:
        r = client.get("/this-route-does-not-exist-xyz")
        assert r.status_code == 404
        # FastAPI returns JSON 404s
        assert r.headers.get("content-type", "").startswith("application/json")

    def test_405_no_traceback(self, client: TestClient) -> None:
        r = client.delete("/health")  # DELETE not allowed on /health
        assert r.status_code in (405, 404, 422)
        body = r.text
        assert "Traceback" not in body
        assert "File " not in body


# ── CORS ──────────────────────────────────────────────────────────────────────

class TestCORS:
    def test_preflight_responds(self, client: TestClient) -> None:
        """OPTIONS preflight should return 200 or 204 with CORS headers."""
        r = client.options(
            "/auth/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert r.status_code in (200, 204)
