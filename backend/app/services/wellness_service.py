"""
Lumina Life OS — Wellness Service
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

CRUD operations for mood entries, sleep sessions, and health appointments.
Also computes streaks, rolling averages, and statistical summaries.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from app.config import supabase_admin
from app.database import db_delete, db_insert, db_select, db_select_one
from app.models.wellness import (
    AppointmentResponse,
    HealthAppointment,
    MoodEntry,
    MoodResponse,
    SleepEntry,
    SleepResponse,
    WellnessStats,
)

logger = logging.getLogger(__name__)

_MOOD_TABLE = "mood_entries"
_SLEEP_TABLE = "sleep_entries"
_APPOINTMENT_TABLE = "health_appointments"


class WellnessService:
    """Provides all wellness data operations and aggregations."""

    # ── Mood ──────────────────────────────────────────────────────────────

    async def log_mood(
        self,
        user_id: str,
        payload: MoodEntry,
    ) -> MoodResponse:
        """Persist a new mood check-in.

        Args:
            user_id: UUID of the owning user.
            payload: Validated ``MoodEntry`` schema.

        Returns:
            The created ``MoodResponse``.
        """
        now = datetime.now(timezone.utc)
        data = {
            "user_id": user_id,
            "mood": payload.mood.value,
            "note": payload.note,
            "tags": payload.tags,
            "logged_at": (payload.logged_at or now).isoformat(),
            "created_at": now.isoformat(),
        }
        row = await db_insert(supabase_admin, _MOOD_TABLE, data)
        return MoodResponse(**row)

    async def get_mood_history(
        self,
        user_id: str,
        limit: int = 30,
        offset: int = 0,
    ) -> list[MoodResponse]:
        """Retrieve paginated mood history for a user.

        Args:
            user_id: UUID of the requesting user.
            limit: Max entries to return.
            offset: Number of entries to skip.

        Returns:
            List of ``MoodResponse`` objects ordered newest first.
        """
        rows = await db_select(
            supabase_admin,
            _MOOD_TABLE,
            filters={"user_id": user_id},
            order_by="logged_at desc",
            limit=limit,
            offset=offset,
        )
        return [MoodResponse(**r) for r in rows]

    # ── Sleep ─────────────────────────────────────────────────────────────

    async def log_sleep(
        self,
        user_id: str,
        payload: SleepEntry,
    ) -> SleepResponse:
        """Persist a new sleep session.

        Automatically calculates ``duration_hours`` from bedtime and wake_time.

        Args:
            user_id: UUID of the owning user.
            payload: Validated ``SleepEntry`` schema.

        Returns:
            The created ``SleepResponse``.
        """
        duration_hours = (
            (payload.wake_time - payload.bedtime).total_seconds() / 3600
        )
        now = datetime.now(timezone.utc)
        data = {
            "user_id": user_id,
            "sleep_date": payload.sleep_date.isoformat(),
            "bedtime": payload.bedtime.isoformat(),
            "wake_time": payload.wake_time.isoformat(),
            "duration_hours": round(duration_hours, 2),
            "quality": payload.quality,
            "notes": payload.notes,
            "created_at": now.isoformat(),
        }
        row = await db_insert(supabase_admin, _SLEEP_TABLE, data)
        return SleepResponse(**row)

    async def get_sleep_history(
        self,
        user_id: str,
        limit: int = 30,
        offset: int = 0,
    ) -> list[SleepResponse]:
        """Retrieve paginated sleep history for a user.

        Args:
            user_id: UUID of the requesting user.
            limit: Max entries to return.
            offset: Records to skip.

        Returns:
            List of ``SleepResponse`` objects ordered newest first.
        """
        rows = await db_select(
            supabase_admin,
            _SLEEP_TABLE,
            filters={"user_id": user_id},
            order_by="sleep_date desc",
            limit=limit,
            offset=offset,
        )
        return [SleepResponse(**r) for r in rows]

    # ── Appointments ──────────────────────────────────────────────────────

    async def create_appointment(
        self,
        user_id: str,
        payload: HealthAppointment,
    ) -> AppointmentResponse:
        """Create a new health appointment.

        Args:
            user_id: UUID of the owning user.
            payload: Validated ``HealthAppointment`` schema.

        Returns:
            The created ``AppointmentResponse``.
        """
        now = datetime.now(timezone.utc)
        data = {
            "user_id": user_id,
            "title": payload.title,
            "doctor_name": payload.doctor_name,
            "location": payload.location,
            "appointment_date": payload.appointment_date.isoformat(),
            "notes": payload.notes,
            "reminder_minutes": payload.reminder_minutes,
            "created_at": now.isoformat(),
        }
        row = await db_insert(supabase_admin, _APPOINTMENT_TABLE, data)
        return AppointmentResponse(**row)

    async def get_appointments(
        self,
        user_id: str,
        upcoming_only: bool = False,
    ) -> list[AppointmentResponse]:
        """Retrieve appointments for a user.

        Args:
            user_id: UUID of the requesting user.
            upcoming_only: When ``True``, return only future appointments.

        Returns:
            List of ``AppointmentResponse`` objects.
        """
        rows = await db_select(
            supabase_admin,
            _APPOINTMENT_TABLE,
            filters={"user_id": user_id},
            order_by="appointment_date asc",
        )
        appointments = [AppointmentResponse(**r) for r in rows]
        if upcoming_only:
            now = datetime.now(timezone.utc)
            appointments = [
                a for a in appointments
                if a.appointment_date.replace(tzinfo=timezone.utc) >= now
            ]
        return appointments

    # ── Stats & Streaks ───────────────────────────────────────────────────

    async def get_stats(self, user_id: str) -> WellnessStats:
        """Compute aggregated wellness statistics for a user.

        Calculates rolling averages, streak counts, and upcoming appointments.

        Args:
            user_id: UUID of the requesting user.

        Returns:
            Populated ``WellnessStats`` model.
        """
        now = datetime.now(timezone.utc)
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()

        # Fetch data in parallel-ish (Supabase client is sync under the hood)
        all_mood = await db_select(
            supabase_admin, _MOOD_TABLE, {"user_id": user_id}, order_by="logged_at desc"
        )
        all_sleep = await db_select(
            supabase_admin, _SLEEP_TABLE, {"user_id": user_id}, order_by="sleep_date desc"
        )
        appointments = await self.get_appointments(user_id, upcoming_only=True)

        # Filter for rolling windows
        mood_7d = [r for r in all_mood if r["logged_at"] >= seven_days_ago]
        mood_30d = [r for r in all_mood if r["logged_at"] >= thirty_days_ago]
        sleep_7d = [r for r in all_sleep if r["sleep_date"] >= seven_days_ago[:10]]

        avg_mood_7d = (
            sum(r["mood"] for r in mood_7d) / len(mood_7d) if mood_7d else None
        )
        avg_mood_30d = (
            sum(r["mood"] for r in mood_30d) / len(mood_30d) if mood_30d else None
        )
        avg_sleep_hours_7d = (
            sum(r["duration_hours"] for r in sleep_7d) / len(sleep_7d)
            if sleep_7d
            else None
        )
        avg_sleep_quality_7d = (
            sum(r["quality"] for r in sleep_7d) / len(sleep_7d) if sleep_7d else None
        )

        mood_streak = self._calculate_streak(
            [r["logged_at"][:10] for r in all_mood]
        )
        sleep_streak = self._calculate_streak(
            [r["sleep_date"] for r in all_sleep]
        )

        return WellnessStats(
            avg_mood_7d=round(avg_mood_7d, 2) if avg_mood_7d is not None else None,
            avg_mood_30d=round(avg_mood_30d, 2) if avg_mood_30d is not None else None,
            avg_sleep_hours_7d=(
                round(avg_sleep_hours_7d, 2) if avg_sleep_hours_7d is not None else None
            ),
            avg_sleep_quality_7d=(
                round(avg_sleep_quality_7d, 2) if avg_sleep_quality_7d is not None else None
            ),
            mood_streak=mood_streak,
            sleep_streak=sleep_streak,
            total_mood_entries=len(all_mood),
            total_sleep_entries=len(all_sleep),
            upcoming_appointments=len(appointments),
        )

    async def get_mood_streak(self, user_id: str) -> int:
        """Return the current consecutive-day mood logging streak.

        Args:
            user_id: UUID of the requesting user.

        Returns:
            Number of consecutive days with at least one mood entry.
        """
        rows = await db_select(
            supabase_admin,
            _MOOD_TABLE,
            {"user_id": user_id},
            columns="logged_at",
            order_by="logged_at desc",
            limit=60,
        )
        dates = [r["logged_at"][:10] for r in rows]
        return self._calculate_streak(dates)

    @staticmethod
    def _calculate_streak(dates: list[str]) -> int:
        """Calculate the current consecutive-day streak from a list of ISO date strings.

        Args:
            dates: List of ``YYYY-MM-DD`` strings, newest first.

        Returns:
            Length of the current consecutive streak.
        """
        if not dates:
            return 0
        unique_dates = sorted(set(dates), reverse=True)
        today = datetime.now(timezone.utc).date()
        streak = 0
        expected = today
        for date_str in unique_dates:
            entry_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            if entry_date == expected or entry_date == expected - timedelta(days=1):
                streak += 1
                expected = entry_date - timedelta(days=1)
            else:
                break
        return streak
