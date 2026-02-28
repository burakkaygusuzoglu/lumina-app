"""
Lumina Life OS — Authentication Middleware
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Provides FastAPI dependency functions that validate Supabase-issued JWTs
and resolve the current authenticated user.  Every protected endpoint
should declare a parameter:

    current_user: TokenData = Depends(get_current_user)

Supabase uses HS256-signed JWTs with the ``SUPABASE_JWT_SECRET`` (the
same as ``SUPABASE_ANON_KEY`` derivation is NOT used; Supabase signs
with a separate ``JWT_SECRET`` that is accessible via the dashboard
→ Settings → API → JWT Secret).  We fall back to validating via the
Supabase Admin API when the secret is not available.
"""

from __future__ import annotations

import logging

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings, supabase_admin
from app.models.user import TokenData

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=True)
_bearer_scheme_optional = HTTPBearer(auto_error=False)


async def _decode_token(token: str) -> TokenData:
    """Decode and validate a Supabase JWT.

    Attempts local HS256 verification first for performance.  Falls back to
    calling the Supabase ``auth.get_user`` API if local verification fails
    (e.g., key mismatch during rotation).

    Args:
        token: Raw JWT string from the ``Authorization`` header.

    Returns:
        TokenData containing the authenticated user's ``user_id`` and ``email``.

    Raises:
        HTTPException: 401 if the token is invalid or the user does not exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # ── Strategy 1: Validate via Supabase Admin API ───────────────────────
    # Most reliable — Supabase handles all key rotation, expiry, and revocation.
    try:
        response = supabase_admin.auth.get_user(token)
        if response and response.user:
            user = response.user
            return TokenData(
                user_id=str(user.id),
                email=user.email,
            )
    except Exception as exc:
        logger.debug("Supabase admin token validation failed: %s", exc)

    # ── Strategy 2: Local JWT decode (when Supabase API is unavailable) ───
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("sub")
        email: str | None = payload.get("email")
        if not user_id:
            raise credentials_exception
        return TokenData(user_id=user_id, email=email)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as exc:
        logger.debug("Local JWT decode failed: %s", exc)
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> TokenData:
    """FastAPI dependency that requires a valid Bearer token.

    Extracts and validates the JWT from the ``Authorization`` header.
    Raises 401 if the token is missing or invalid.

    Args:
        credentials: Injected by FastAPI's HTTPBearer scheme.

    Returns:
        Validated ``TokenData`` for the authenticated user.

    Raises:
        HTTPException: 401 if authentication fails.
    """
    return await _decode_token(credentials.credentials)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme_optional),
) -> TokenData | None:
    """FastAPI dependency that accepts requests with or without a token.

    Useful for endpoints that behave differently for authenticated vs.
    anonymous users (e.g., public profile pages).

    Args:
        credentials: Optional injected bearer credentials.

    Returns:
        ``TokenData`` if a valid token is present, otherwise ``None``.
    """
    if not credentials:
        return None
    try:
        return await _decode_token(credentials.credentials)
    except HTTPException:
        return None
