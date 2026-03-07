"""
Lumina Life OS — Wellness Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Handles mood logging, sleep tracking, health appointments, and aggregated stats.
All routes require authentication and enforce user data isolation.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query, status

from app.middleware.auth_middleware import get_current_user
from app.models.user import TokenData
from app.models.wellness import (
    AppointmentResponse,
    HealthAppointment,
    MoodEntry,
    MoodResponse,
    SleepEntry,
    SleepResponse,
    WellnessStats,
)
from app.services.wellness_service import WellnessService
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/wellness", tags=["Wellness Module"])
_svc = WellnessService()


# ── Mood ──────────────────────────────────────────────────────────────────────

@router.post(
    "/mood",
    response_model=MoodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a mood check-in",
)
async def log_mood(
    payload: MoodEntry,
    current_user: TokenData = Depends(get_current_user),
) -> MoodResponse:
    """Record a mood check-in for the authenticated user.

    Args:
        payload: ``MoodEntry`` with mood level and optional context.
        current_user: Injected from JWT.

    Returns:
        The created ``MoodResponse``.
    """
    return await _svc.log_mood(user_id=current_user.user_id, payload=payload)


@router.get(
    "/mood/history",
    response_model=list[MoodResponse],
    status_code=status.HTTP_200_OK,
    summary="Get mood check-in history",
)
async def get_mood_history(
    limit: int = Query(30, ge=1, le=90, description="Number of entries"),
    offset: int = Query(0, ge=0),
    current_user: TokenData = Depends(get_current_user),
) -> list[MoodResponse]:
    """Return paginated mood history for the authenticated user.

    Args:
        limit: Max entries to return.
        offset: Pagination offset.
        current_user: Injected from JWT.

    Returns:
        List of ``MoodResponse`` objects, newest first.
    """
    return await _svc.get_mood_history(
        user_id=current_user.user_id, limit=limit, offset=offset
    )


# ── Sleep ─────────────────────────────────────────────────────────────────────

@router.post(
    "/sleep",
    response_model=SleepResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a sleep session",
)
async def log_sleep(
    payload: SleepEntry,
    current_user: TokenData = Depends(get_current_user),
) -> SleepResponse:
    """Record a sleep session with automatic duration calculation.

    Args:
        payload: ``SleepEntry`` with bed and wake times.
        current_user: Injected from JWT.

    Returns:
        The created ``SleepResponse`` including calculated ``duration_hours``.
    """
    return await _svc.log_sleep(user_id=current_user.user_id, payload=payload)


@router.get(
    "/sleep/history",
    response_model=list[SleepResponse],
    status_code=status.HTTP_200_OK,
    summary="Get sleep history",
)
async def get_sleep_history(
    limit: int = Query(30, ge=1, le=90),
    offset: int = Query(0, ge=0),
    current_user: TokenData = Depends(get_current_user),
) -> list[SleepResponse]:
    """Return paginated sleep history for the authenticated user.

    Args:
        limit: Max sessions to return.
        offset: Pagination offset.
        current_user: Injected from JWT.

    Returns:
        List of ``SleepResponse`` objects.
    """
    return await _svc.get_sleep_history(
        user_id=current_user.user_id, limit=limit, offset=offset
    )


# ── Appointments ──────────────────────────────────────────────────────────────

@router.post(
    "/appointment",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a health appointment",
)
async def create_appointment(
    payload: HealthAppointment,
    current_user: TokenData = Depends(get_current_user),
) -> AppointmentResponse:
    """Save a new health or wellness appointment.

    Args:
        payload: ``HealthAppointment`` details.
        current_user: Injected from JWT.

    Returns:
        The created ``AppointmentResponse``.
    """
    return await _svc.create_appointment(user_id=current_user.user_id, payload=payload)


@router.get(
    "/appointments",
    response_model=list[AppointmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get health appointments",
)
async def get_appointments(
    upcoming_only: bool = Query(False, description="Return only future appointments"),
    current_user: TokenData = Depends(get_current_user),
) -> list[AppointmentResponse]:
    """Return health appointments for the authenticated user.

    Args:
        upcoming_only: Filter to future dates only.
        current_user: Injected from JWT.

    Returns:
        List of ``AppointmentResponse`` objects.
    """
    return await _svc.get_appointments(
        user_id=current_user.user_id, upcoming_only=upcoming_only
    )


@router.delete(
    "/appointment/{appointment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a health appointment",
)
async def delete_appointment(
    appointment_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> None:
    """Delete a health appointment by ID."""
    from app.config import supabase_admin
    supabase_admin.table("appointments").delete().eq("id", appointment_id).eq("user_id", current_user.user_id).execute()


class ExerciseLog(BaseModel):
    exercise_type: str
    duration_minutes: int
    calories_burned: Optional[int] = None
    notes: Optional[str] = None


@router.post(
    "/exercise",
    status_code=status.HTTP_201_CREATED,
    summary="Log an exercise session",
)
async def log_exercise(
    payload: ExerciseLog,
    current_user: TokenData = Depends(get_current_user),
) -> dict:
    """Record an exercise session for the authenticated user."""
    from app.config import supabase_admin
    from datetime import datetime, timezone
    row = {
        "user_id": current_user.user_id,
        "exercise_type": payload.exercise_type,
        "duration_minutes": payload.duration_minutes,
        "calories_burned": payload.calories_burned,
        "notes": payload.notes,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase_admin.table("exercise_logs").insert(row).execute()
    data = result.data[0] if result.data else row
    return data


@router.get(
    "/exercise/history",
    status_code=status.HTTP_200_OK,
    summary="Get exercise history",
)
async def get_exercise_history(
    limit: int = Query(20, ge=1, le=50),
    current_user: TokenData = Depends(get_current_user),
) -> list[dict]:
    """Return recent exercise logs for the authenticated user, newest first."""
    from app.config import supabase_admin
    result = (
        supabase_admin.table("exercise_logs")
        .select("*")
        .eq("user_id", current_user.user_id)
        .order("recorded_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ── Stats & Streak ────────────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=WellnessStats,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated wellness statistics",
)
async def get_stats(
    current_user: TokenData = Depends(get_current_user),
) -> WellnessStats:
    """Return comprehensive wellness stats including averages and streaks.

    Args:
        current_user: Injected from JWT.

    Returns:
        ``WellnessStats`` with rolling averages, streaks, and appointment counts.
    """
    return await _svc.get_stats(user_id=current_user.user_id)


@router.get(
    "/streak",
    status_code=status.HTTP_200_OK,
    summary="Get current mood logging streak",
)
async def get_streak(
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, int]:
    """Return the user's current consecutive mood-logging streak.

    Args:
        current_user: Injected from JWT.

    Returns:
        Dict with ``streak_days`` key.
    """
    streak = await _svc.get_mood_streak(user_id=current_user.user_id)
    return {"streak_days": streak}
