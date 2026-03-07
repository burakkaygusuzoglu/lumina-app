"""
Lumina Life OS — Authentication Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Handles user registration, login, logout, token refresh, and profile retrieval
using Supabase Auth as the identity provider.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import supabase_admin, supabase_client
from app.middleware.auth_middleware import get_current_user
from app.models.user import RefreshRequest, Token, TokenData, UserCreate, UserLogin, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Rate limiter instance (re-uses same key func as main app)
_limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@_limiter.limit("5/minute")
async def register(request: Request, payload: UserCreate) -> Token:
    """Create a new Lumina account using Supabase Auth.

    Args:
        payload: Registration details (email, password, full_name).

    Returns:
        JWT access token and public user profile.

    Raises:
        HTTPException: 400 if registration fails (e.g. email already taken).
    """
    try:
        response = supabase_client.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": {
                        "full_name": payload.full_name,
                    }
                },
            }
        )
    except Exception as exc:
        logger.error("Registration failed for %s: %s", payload.email, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if not response.user or not response.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed — check email and password requirements.",
        )

    user = response.user
    return Token(
        access_token=response.session.access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.user_metadata.get("full_name", ""),
            avatar_url=user.user_metadata.get("avatar_url"),
            created_at=user.created_at,
        ),
    )


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
)
@_limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin) -> Token:
    """Authenticate an existing user and return a JWT.

    Args:
        payload: Login credentials (email, password).

    Returns:
        JWT access token and public user profile.

    Raises:
        HTTPException: 401 if credentials are invalid.
    """
    try:
        response = supabase_client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if not response.user or not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = response.user
    return Token(
        access_token=response.session.access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.user_metadata.get("full_name", ""),
            avatar_url=user.user_metadata.get("avatar_url"),
            created_at=user.created_at,
        ),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout the current user",
)
async def logout(
    current_user: TokenData = Depends(get_current_user),
) -> None:
    """Invalidate the current session.

    JWT tokens are stateless — the client discards the token on logout.
    We perform a best-effort server-side sign-out via the admin client.

    Args:
        current_user: Injected from the JWT dependency.
    """
    try:
        # Revoke all refresh tokens for this user without deleting the account
        supabase_admin.auth.admin.sign_out(current_user.user_id)
    except Exception:
        # Sign-out is best-effort; client should discard the token regardless
        pass


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the current authenticated user's profile",
)
async def get_me(
    current_user: TokenData = Depends(get_current_user),
) -> UserResponse:
    """Return the authenticated user's public profile.

    Args:
        current_user: Injected TokenData from the JWT dependency.

    Returns:
        ``UserResponse`` for the authenticated user.

    Raises:
        HTTPException: 404 if the user no longer exists.
    """
    try:
        response = supabase_admin.auth.admin.get_user_by_id(current_user.user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        ) from exc

    user = response.user
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.user_metadata.get("full_name", ""),
        avatar_url=user.user_metadata.get("avatar_url"),
        created_at=user.created_at,
    )


@router.post(
    "/refresh",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Refresh an expired access token",
)
async def refresh_token(payload: RefreshRequest) -> Token:
    """Exchange a Supabase refresh token for a new access token.

    Args:
        payload: ``RefreshRequest`` containing the refresh token.

    Returns:
        New ``Token`` with fresh access token.

    Raises:
        HTTPException: 401 if the refresh token is invalid or expired.
    """
    try:
        response = supabase_client.auth.refresh_session(payload.refresh_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired",
        ) from exc

    if not response.user or not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh session",
        )

    user = response.user
    return Token(
        access_token=response.session.access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.user_metadata.get("full_name", ""),
            avatar_url=user.user_metadata.get("avatar_url"),
            created_at=user.created_at,
        ),
    )


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Send a password-reset email",
)
@_limiter.limit("3/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest) -> dict:
    """Send a Supabase password-reset email.

    Always returns 200 regardless of whether the email exists, to prevent
    user enumeration attacks.

    Args:
        payload: ``ForgotPasswordRequest`` with the user's email address.

    Returns:
        Generic success message.
    """
    try:
        supabase_client.auth.reset_password_for_email(
            payload.email,
            {"redirect_to": "https://lumina-app-pink.vercel.app/reset-password"},
        )
    except Exception as exc:
        # Log internally but never reveal whether the email exists
        logger.warning("Password reset request error for %s: %s", payload.email, exc)

    return {"message": "If that email is registered, a reset link has been sent."}


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None


@router.put(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user's profile",
)
async def update_profile(
    payload: ProfileUpdate,
    current_user: TokenData = Depends(get_current_user),
) -> UserResponse:
    """Update full_name and/or avatar_url for the authenticated user."""
    try:
        updates: dict = {}
        if payload.full_name is not None:
            updates["full_name"] = payload.full_name
        if payload.avatar_url is not None:
            updates["avatar_url"] = payload.avatar_url

        response = supabase_admin.auth.admin.update_user_by_id(
            current_user.user_id,
            {"user_metadata": updates},
        )
        user = response.user
        return UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.user_metadata.get("full_name", ""),
            avatar_url=user.user_metadata.get("avatar_url"),
            created_at=user.created_at,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/export", summary="Export all user data as JSON")
async def export_data(
    current_user: TokenData = Depends(get_current_user),
) -> dict:
    """Export all user data as a downloadable JSON payload."""
    from datetime import datetime, timezone

    user_id = current_user.user_id

    def safe_fetch(table: str, select_cols: str = "*") -> list:
        try:
            return (
                supabase_admin.table(table)
                .select(select_cols)
                .eq("user_id", user_id)
                .execute()
                .data
                or []
            )
        except Exception:
            return []

    journals  = safe_fetch("journal_entries")
    memories  = safe_fetch("memories")
    tasks     = safe_fetch("tasks")
    moods     = safe_fetch("mood_entries")
    vault_meta = safe_fetch("vault_items", "id,name,item_type,created_at")
    nutrition = safe_fetch("nutrition_logs")

    try:
        user_resp = supabase_admin.auth.admin.get_user_by_id(user_id)
        u = user_resp.user
        user_data = {
            "email": u.email,
            "full_name": u.user_metadata.get("full_name", "") if u else "",
            "created_at": str(u.created_at) if u else "",
        }
    except Exception:
        user_data = {}

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": user_data,
        "journal_entries": journals,
        "memories": memories,
        "tasks": tasks,
        "mood_entries": moods,
        "nutrition_logs": nutrition,
        "vault_items_count": len(vault_meta),
    }
