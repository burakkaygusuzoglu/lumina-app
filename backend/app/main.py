"""
Lumina Life OS — FastAPI Application Entry Point
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Initialises the FastAPI application, registers all routers, configures
CORS and middleware, and exposes the OpenAPI documentation.

Run with:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse

# Load .env before importing config (config reads env vars at import time)
load_dotenv()

from app.config import settings  # noqa: E402 — must be after load_dotenv
from app.routers import (  # noqa: E402
    ai_chat_router,
    auth_router,
    journal_router,
    memories_router,
    tasks_router,
    vault_router,
    wellness_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Application factory ────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    description=(
        "**Lumina Life OS** — AI-powered personal life operating system.\n\n"
        "Five intelligent modules unified by an AI Core:\n"
        "- 🧠 **Mind** — notes, ideas, semantic search\n"
        "- 💚 **Wellness** — mood, sleep, health tracking\n"
        "- 🔒 **Vault** — AES-256 encrypted secrets\n"
        "- 📅 **Life** — tasks, calendar, AI prioritisation\n"
        "- 📖 **Journal** — AI prompts, reflection, Time Capsule\n\n"
        "Built by **Burak Kaygusuzoglu** · [GitHub](https://github.com/burakkaygusuzoglu)"
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
    license_info={
        "name": "MIT",
    },
)

# ── CORS ───────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(memories_router)
app.include_router(wellness_router)
app.include_router(tasks_router)
app.include_router(vault_router)
app.include_router(journal_router)
app.include_router(ai_chat_router)

# ── Custom docs (unpkg CDN — avoids jsdelivr blocking) ─────────────────────


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui() -> HTMLResponse:
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{settings.app_name} — API Docs",
        swagger_js_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )


@app.get("/redoc", include_in_schema=False)
async def custom_redoc() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{settings.app_name} — ReDoc",
        redoc_js_url="https://unpkg.com/redoc@latest/bundles/redoc.standalone.js",
    )


# ── Base endpoints ─────────────────────────────────────────────────────────


@app.get(
    "/",
    tags=["System"],
    summary="API root — returns app info",
)
async def root() -> dict:
    """Return basic application metadata.

    Returns:
        Dict with app name, version, status, and developer.
    """
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
    summary="Health check",
)
async def health() -> dict:
    """Lightweight health probe for load balancers and monitoring.

    Returns:
        Dict with status ``healthy``.
    """
    return {"status": "healthy", "version": settings.app_version}


# ── Startup / shutdown events ──────────────────────────────────────────────


@app.on_event("startup")
async def on_startup() -> None:
    """Log router registration on startup."""
    routes = [r.path for r in app.routes if hasattr(r, "path")]
    logger.info(
        "✨ Lumina Life OS v%s started — %d routes registered",
        settings.app_version,
        len(routes),
    )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Clean up resources on graceful shutdown."""
    logger.info("Lumina Life OS shutting down — goodbye 👋")