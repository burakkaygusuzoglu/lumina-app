"""
Lumina Life OS â€” FastAPI Application Entry Point
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Initialises the FastAPI application, registers all routers, configures
CORS, security headers, GZip compression, rate limiting, and structured
access logging.

Run with:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import json
import logging
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Load .env before importing config (config reads env vars at import time)
load_dotenv()

from app.config import settings  # noqa: E402 â€” must be after load_dotenv
from app.middleware.security import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.routers import (  # noqa: E402
    ai_chat_router,
    auth_router,
    health_router,
    journal_router,
    memories_router,
    tasks_router,
    vault_router,
    wellness_router,
)


# ── JSON structured logging ──────────────────────────────────────────────────
class _JsonFormatter(logging.Formatter):
    """Emit each log record as a single JSON line — Railway/Datadog-friendly."""

    def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
        payload: dict = {
            "ts":     self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level":  record.levelname,
            "logger": record.name,
            "msg":    record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)
    for noisy in ("httpx", "httpcore", "anthropic", "pinecone", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


_configure_logging()
logger = logging.getLogger(__name__)

# â”€â”€ Rate limiter (slowapi) â€” ip-based for public endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# â”€â”€ Application factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app = FastAPI(
    title=settings.app_name,
    description=(
        "**Lumina Life OS** â€” AI-powered personal life operating system.\n\n"
        "Five intelligent modules unified by an AI Core:\n"
        "- ğŸ§  **Mind** â€” notes, ideas, semantic search\n"
        "- ğŸ’š **Wellness** â€” mood, sleep, health tracking\n"
        "- ğŸ”’ **Vault** â€” AES-256 encrypted secrets\n"
        "- ğŸ“… **Life** â€” tasks, calendar, AI prioritisation\n"
        "- ğŸ“– **Journal** â€” AI prompts, reflection, Time Capsule\n\n"
        "Built by **Burak Kaygusuzoglu** Â· [GitHub](https://github.com/burakkaygusuzoglu)"
    ),
    version=settings.app_version,
    # Disable built-in CDN-dependent docs; custom routes defined below
    docs_url=None,
    redoc_url=None,
    openapi_url="/openapi.json",
    contact={
        "name": "Burak Kaygusuzoglu",
        "email": "bkaygusuzoglu@hotmail.com",
    },
    license_info={"name": "MIT"},
)

# Attach rate limiter state and handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# â”€â”€ Middleware stack (outermost first) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# 1. CORS  (must be before security headers so preflight OPTIONS works)
# Read ALLOWED_ORIGINS directly from env so comma-separated or JSON-array
# strings both work regardless of pydantic-settings list-parsing behaviour.
def _build_cors_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if raw.startswith("["):
        return json.loads(raw)
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return settings.allowed_origins

_cors_origins = ["*"] if settings.debug else _build_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=not settings.debug,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # Cache preflight OPTIONS for 24 h
)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware, debug=settings.debug)

# 3. Structured access logging
app.add_middleware(RequestLoggingMiddleware)

# 4. GZip compression (min 1 KB to avoid overhead on tiny payloads)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# â”€â”€ Routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.include_router(auth_router)
app.include_router(memories_router)
app.include_router(wellness_router)
app.include_router(tasks_router)
app.include_router(vault_router)
app.include_router(journal_router)
app.include_router(ai_chat_router)
app.include_router(health_router)

# â”€â”€ Custom docs (unpkg CDN â€” avoids jsdelivr blocking) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui() -> HTMLResponse:
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{settings.app_name} â€” API Docs",
        swagger_js_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )


@app.get("/redoc", include_in_schema=False)
async def custom_redoc() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{settings.app_name} â€” ReDoc",
        redoc_js_url="https://unpkg.com/redoc@latest/bundles/redoc.standalone.js",
    )


# â”€â”€ Base endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Track startup time for uptime calculation
_START_TIME = time.time()


@app.get(
    "/",
    tags=["System"],
    summary="API root â€” returns app info",
)
async def root() -> dict:
    """Return basic application metadata."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "developer": "Burak Kaygusuzoglu",
        "docs": "/docs",
        "modules": ["mind", "wellness", "vault", "life", "journal", "ai_core"],
    }


@app.get(
    "/health",
    tags=["System"],
    summary="Health check â€” returns detailed service status",
)
async def health() -> dict:
    """Detailed health probe for load balancers and monitoring.

    Returns:
        status, version, database connectivity, uptime, and timestamp.
    """
    import datetime

    from app.config import supabase_client

    # Quick connectivity probe â€” cheapest possible query
    db_status = "connected"
    try:
        supabase_client.table("memories").select("id").limit(1).execute()
    except Exception:
        db_status = "degraded"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": settings.app_version,
        "database": db_status,
        "uptime_seconds": round(time.time() - _START_TIME),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "debug_mode": settings.debug,
    }


# â”€â”€ Global error handler â€” never leak internal details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all: log the full traceback server-side, return generic message."""
    import traceback

    logger.error(
        "Unhandled exception on %s %s:\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# â”€â”€ Startup / shutdown events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


@app.on_event("startup")
async def on_startup() -> None:
    """Log router registration on startup."""
    routes = [r.path for r in app.routes if hasattr(r, "path")]
    logger.info(
        "âœ¨ Lumina Life OS v%s started â€” %d routes | debug=%s",
        settings.app_version,
        len(routes),
        settings.debug,
    )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("Lumina Life OS shutting down â€” goodbye ğŸ‘‹")
