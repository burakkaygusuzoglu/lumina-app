"""
Lumina Life OS — Configuration Module
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Centralised settings loaded from environment variables using pydantic-settings.
All downstream modules import `settings` and `supabase_client` from this module.
"""

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import create_client, Client

# Resolve the .env file path relative to this file:
# config.py lives at  backend/app/config.py
# .env lives at       backend/.env
_ENV_FILE: Path = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Application-wide settings resolved from environment variables.

    All values are required unless a default is provided; a missing variable
    will raise a ``ValidationError`` at startup rather than at first use.
    """

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Supabase ──────────────────────────────────────────────────────────────
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anonymous/public key")
    supabase_service_role_key: str = Field(..., description="Supabase service-role key (server-side only)")

    # ── Anthropic ─────────────────────────────────────────────────────────────
    anthropic_api_key: str = Field(..., description="Anthropic API key for Claude")
    anthropic_model: str = Field(default="claude-sonnet-4-6", description="Claude model identifier")

    # ── Pinecone ──────────────────────────────────────────────────────────────
    pinecone_api_key: str = Field(default="", description="Pinecone API key (optional until semantic search)")
    pinecone_index: str = Field(default="lumina-memories", description="Pinecone index name")

    # ── Security ──────────────────────────────────────────────────────────────
    jwt_secret_key: str = Field(default="lumina-dev-secret-change-in-production", description="JWT signing secret")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=60 * 24 * 7, description="Access token TTL in minutes (default 7 days)")

    # ── Vault Encryption ─────────────────────────────────────────────────────
    vault_encryption_key: str = Field(
        default="lumina-vault-key-32-bytes-padded!",
        description="AES-256 master key for Vault — must be exactly 32 bytes in production",
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = Field(default="Lumina Life OS")
    app_version: str = Field(default="1.0.0")
    debug: bool = Field(default=False)
    allowed_origins: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://localhost:8081",
            "exp://localhost:8081",
            "https://lumina-app.vercel.app",
            "https://lumina-life.vercel.app",
        ],
        description="CORS allowed origins — extend via ALLOWED_ORIGINS env var in production",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton.

    Returns:
        Settings: Validated settings object.
    """
    return Settings()


# ── Module-level singletons ────────────────────────────────────────────────

settings: Settings = get_settings()

# Anon client — for auth operations that should respect Row Level Security
supabase_client: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Service-role client — bypasses RLS; use only in trusted server-side code
supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
