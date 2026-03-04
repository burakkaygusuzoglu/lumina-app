"""
Lumina Life OS — Wellness Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>
"""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class MoodEntry(BaseModel):
    """Single mood data point recorded by the user."""

    model_config = ConfigDict(str_strip_whitespace=True)

    mood_score: int = Field(..., ge=1, le=10, description="Mood level 1-10")
    note: str | None = Field(None, max_length=500, description="Optional accompanying note")
    tags: list[str] = Field(default_factory=list, description="Context tags")


class MoodResponse(BaseModel):
    """Stored mood entry returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    mood_score: int
    note: str | None = None
    tags: list[str] = []
    created_at: datetime


class SleepEntry(BaseModel):
    """Sleep session recorded by the user."""

    model_config = ConfigDict(str_strip_whitespace=True)

    hours: float = Field(..., ge=0, le=24, description="Hours slept")
    quality: int = Field(..., ge=1, le=10, description="Self-reported quality 1-10")
    notes: str | None = Field(None, max_length=500)


class SleepResponse(BaseModel):
    """Stored sleep entry returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    hours_slept: float
    quality: int
    notes: str | None = None
    created_at: datetime


class HealthAppointment(BaseModel):
    """Medical or wellness appointment."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(..., max_length=255)
    doctor: str | None = Field(None, max_length=120)
    date: str = Field(..., description="Date string YYYY-MM-DD")
    time: str = Field(..., description="Time string HH:MM")
    notes: str | None = Field(None, max_length=1000)


class AppointmentResponse(BaseModel):
    """Stored appointment returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    doctor: str | None = None
    date: str
    time: str
    notes: str | None = None
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
