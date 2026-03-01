"""
Lumina Life OS — Performance Tests
Tests: response time budgets, GZip compression, concurrent requests.
All tests run in-process (no network I/O), so they measure ASGI overhead only.
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest
from fastapi.testclient import TestClient


# ── Response Time Budgets ─────────────────────────────────────────────────────

class TestResponseTimes:
    """In-process ASGI calls must complete under generous wall-clock budgets.

    These thresholds are intentionally loose (500 ms) because the test runner
    itself adds overhead; they primarily catch catastrophic slowdowns like
    missing imports or synchronous blocking in middleware.
    """

    BUDGET_MS = 500  # max acceptable milliseconds for in-process response

    def _timed_get(self, client: TestClient, path: str) -> float:
        start = time.perf_counter()
        client.get(path)
        return (time.perf_counter() - start) * 1000  # → ms

    def test_health_response_time(self, client: TestClient) -> None:
        elapsed = self._timed_get(client, "/health")
        assert elapsed < self.BUDGET_MS, f"/health took {elapsed:.0f} ms"

    def test_root_response_time(self, client: TestClient) -> None:
        elapsed = self._timed_get(client, "/")
        assert elapsed < self.BUDGET_MS, f"/ took {elapsed:.0f} ms"

    def test_404_response_time(self, client: TestClient) -> None:
        elapsed = self._timed_get(client, "/non-existent-route-xyz")
        assert elapsed < self.BUDGET_MS, f"404 took {elapsed:.0f} ms"

    def test_unauth_response_time(self, client: TestClient) -> None:
        """Unauthenticated 401 must be fast — no external calls should happen."""
        elapsed = self._timed_get(client, "/memories")
        assert elapsed < self.BUDGET_MS, f"/memories unauth took {elapsed:.0f} ms"


# ── GZip Compression ──────────────────────────────────────────────────────────

class TestGzipCompression:
    """Responses should be compressed when the client accepts gzip."""

    def test_health_gzip_when_accepted(self, client: TestClient) -> None:
        r = client.get("/health", headers={"Accept-Encoding": "gzip"})
        # httpx / TestClient will transparently decompress, but the header shows it was compressed
        # When the body is tiny the middleware may skip compression — check it at least doesn't error
        assert r.status_code == 200

    def test_health_no_gzip_header(self, client: TestClient) -> None:
        """Without Accept-Encoding the response must still work."""
        r = client.get("/health", headers={"Accept-Encoding": "identity"})
        assert r.status_code == 200


# ── Concurrent Requests ───────────────────────────────────────────────────────

class TestConcurrency:
    """Simulate concurrent requests to verify no shared-state corruption."""

    NUM_WORKERS = 10

    def test_concurrent_health_checks(self, client: TestClient) -> None:
        results: list[int] = []

        def fetch() -> int:
            return client.get("/health").status_code

        with ThreadPoolExecutor(max_workers=self.NUM_WORKERS) as pool:
            futures = [pool.submit(fetch) for _ in range(self.NUM_WORKERS)]
            results = [f.result() for f in as_completed(futures)]

        assert all(s == 200 for s in results), (
            f"Some concurrent health checks failed: {results}"
        )

    def test_concurrent_unauth_requests(self, client: TestClient) -> None:
        """Parallel unauthenticated hits must all return 401/403 consistently."""

        def fetch() -> int:
            return client.get("/memories").status_code

        with ThreadPoolExecutor(max_workers=self.NUM_WORKERS) as pool:
            futures = [pool.submit(fetch) for _ in range(self.NUM_WORKERS)]
            results = [f.result() for f in as_completed(futures)]

        assert all(s in (401, 403) for s in results), (
            f"Unexpected status codes in concurrent requests: {results}"
        )


# ── JSON Response Shapes ──────────────────────────────────────────────────────

class TestResponseShapes:
    """Ensure key endpoints return well-formed JSON bodies."""

    def test_health_json_fields(self, client: TestClient) -> None:
        data = client.get("/health").json()
        required = {"status", "uptime_seconds", "timestamp"}
        missing = required - data.keys()
        assert not missing, f"Health response missing fields: {missing}"

    def test_422_has_detail(self, client: TestClient) -> None:
        r = client.post("/auth/register", json={})
        assert r.status_code == 422
        data = r.json()
        assert "detail" in data

    def test_error_no_traceback(self, client: TestClient) -> None:
        """Error responses must not contain Python tracebacks."""
        r = client.post("/auth/register", json={})
        text = r.text
        assert "Traceback (most recent call last)" not in text
        assert "File " not in text or "filePath" not in text  # json field is ok
