"""
Lumina Life OS — User Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Payload for registering a new user account.

    Attributes:
        email: Valid email address used as the login identifier.
        password: Plain-text password; must be at least 8 characters.
        full_name: Display name for the user.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Plaintext password (≥8 chars)")
    full_name: str = Field(..., min_length=1, max_length=120, description="User display name")


class UserLogin(BaseModel):
    """Payload for authenticating an existing user.

    Attributes:
        email: Registered email address.
        password: Account password.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """Public representation of a user returned from API endpoints.

    Attributes:
        id: UUID assigned by Supabase Auth.
        email: User's email address.
        full_name: User's display name.
        avatar_url: Optional profile picture URL.
        created_at: Account creation timestamp.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    created_at: datetime | None = None


class Token(BaseModel):
    """JWT token pair returned after successful authentication.

    Attributes:
        access_token: Short-lived JWT for authorising requests.
        token_type: Always ``bearer``.
        user: Public user profile.
    """

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Decoded JWT token payload used internally.

    Attributes:
        user_id: Subject claim — the authenticated user's UUID.
        email: Email extracted from token claims.
    """

    user_id: str
    email: str | None = None


class RefreshRequest(BaseModel):
    """Payload for refreshing an expired access token.

    Attributes:
        refresh_token: Supabase refresh token.
    """

    refresh_token: str
