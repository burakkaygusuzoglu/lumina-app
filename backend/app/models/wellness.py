"""
Lumina Life OS — Wellness Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class MoodLevel(int, Enum):
    """Numeric mood scale from 1 (very bad) to 5 (excellent)."""

    VERY_BAD = 1
    BAD = 2
    NEUTRAL = 3
    GOOD = 4
    EXCELLENT = 5


class MoodEntry(BaseModel):
    """Single mood data point recorded by the user.

    Attributes:
        mood: Numeric level from ``MoodLevel`` (1-5).
        note: Optional free-text note accompanying the check-in.
        tags: Context labels such as ``work``, ``exercise``, ``social``.
        logged_at: When the mood was felt; defaults to now.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    mood: MoodLevel = Field(..., description="Mood level 1-5")
    note: str | None = Field(None, max_length=500, description="Optional accompanying note")
    tags: list[str] = Field(default_factory=list, description="Context tags")
    logged_at: datetime | None = Field(None, description="Timestamp; defaults to now if omitted")


class MoodResponse(BaseModel):
    """Stored mood entry returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    mood: int
    note: str | None = None
    tags: list[str] = []
    logged_at: datetime
    created_at: datetime


class SleepEntry(BaseModel):
    """Sleep session recorded by the user.

    Attributes:
        sleep_date: Calendar date for the night being recorded.
        bedtime: When the user went to bed.
        wake_time: When the user woke up.
        quality: Self-reported quality score 1-5.
        notes: Optional observations.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    sleep_date: date = Field(..., description="Calendar date of the sleep session")
    bedtime: datetime = Field(..., description="When user went to bed")
    wake_time: datetime = Field(..., description="When user woke up")
    quality: int = Field(..., ge=1, le=5, description="Self-reported quality 1-5")
    notes: str | None = Field(None, max_length=500)


class SleepResponse(BaseModel):
    """Stored sleep entry returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    sleep_date: date
    bedtime: datetime
    wake_time: datetime
    duration_hours: float
    quality: int
    notes: str | None = None
    created_at: datetime


class HealthAppointment(BaseModel):
    """Medical or wellness appointment.

    Attributes:
        title: Appointment description (e.g. ``Dentist check-up``).
        doctor_name: Name of the practitioner.
        location: Clinic or hospital name/address.
        appointment_date: When the appointment takes place.
        notes: Any preparation notes or follow-ups.
        reminder_minutes: Minutes before appointment to send reminder.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(..., max_length=255)
    doctor_name: str | None = Field(None, max_length=120)
    location: str | None = Field(None, max_length=255)
    appointment_date: datetime = Field(...)
    notes: str | None = Field(None, max_length=1000)
    reminder_minutes: int = Field(default=60, ge=0)


class AppointmentResponse(BaseModel):
    """Stored appointment returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    doctor_name: str | None = None
    location: str | None = None
    appointment_date: datetime
    notes: str | None = None
    reminder_minutes: int
    created_at: datetime


class WellnessStats(BaseModel):
    """Aggregated wellness statistics for the current user.

    Attributes:
        avg_mood_7d: Average mood score over the last 7 days.
        avg_mood_30d: Average mood score over the last 30 days.
        avg_sleep_hours_7d: Average nightly sleep duration (hours) over 7 days.
        avg_sleep_quality_7d: Average sleep quality over 7 days.
        mood_streak: Consecutive days the user has logged mood.
        sleep_streak: Consecutive days the user has logged sleep.
        total_mood_entries: All-time mood entry count.
        total_sleep_entries: All-time sleep entry count.
        upcoming_appointments: Number of future appointments.
    """

    avg_mood_7d: float | None = None
    avg_mood_30d: float | None = None
    avg_sleep_hours_7d: float | None = None
    avg_sleep_quality_7d: float | None = None
    mood_streak: int = 0
    sleep_streak: int = 0
    total_mood_entries: int = 0
    total_sleep_entries: int = 0
    upcoming_appointments: int = 0
