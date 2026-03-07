"""
Lumina Life OS — Security Headers & Structured Logging Middleware
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Adds production-grade security headers to every response and structured
per-request logging (method, path, user_id, duration_ms, status_code).
"""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("lumina.access")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Append OWASP-recommended security headers to every HTTP response."""

    def __init__(self, app: ASGIApp, debug: bool = False) -> None:
        super().__init__(app)
        self._debug = debug

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Disallow embedding in iframes (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"
        # Legacy XSS filter (belt-and-suspenders for old browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Referrer policy — don't leak path info to third parties
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Permissions policy — disable sensors/features not needed
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        if not self._debug:
            # HSTS — enforce HTTPS for 1 year (production only)
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
            # CSP — restrict resource origins (tighten when serving HTML)
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' https://unpkg.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://*.supabase.co; "
                "frame-ancestors 'none'"
            )

        # Cache authenticated GET responses on the client side (private = CDN won't cache)
        if request.method == "GET" and response.status_code == 200:
            path = request.url.path
            if not any(skip in path for skip in ("/health", "/docs", "/redoc", "/openapi")):
                response.headers.setdefault(
                    "Cache-Control", "private, max-age=30, stale-while-revalidate=120"
                )

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Structured access log: method, path, user, status, duration."""

    _SKIP_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/"}

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        skip_log = request.url.path in self._SKIP_PATHS
        start = time.perf_counter()

        # Best-effort user extraction from Authorization header (no full parse)
        auth = request.headers.get("Authorization", "")
        user_hint = "anon"
        if auth.startswith("Bearer "):
            # Just capture the last 6 chars of token as a trace hint
            user_hint = f"…{auth[-6:]}"

        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            if not skip_log:
                logger.error(
                    "[%s] %s %s | user=%s | ERROR | %sms",
                    request_id,
                    request.method,
                    request.url.path,
                    user_hint,
                    duration_ms,
                )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        # Attach request-id to ALL responses for distributed tracing
        response.headers["X-Request-ID"] = request_id

        if not skip_log:
            log_fn = logger.warning if response.status_code >= 400 else logger.info
            log_fn(
                "[%s] %s %s | user=%s | %s | %sms",
                request_id,
                request.method,
                request.url.path,
                user_hint,
                response.status_code,
                duration_ms,
            )
        return response
