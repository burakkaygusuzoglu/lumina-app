"""
Lumina Life OS — AI Chat Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Exposes the Lumina AI Core to clients. Handles contextual chat,
weekly life reports, mood pattern analysis, and insight history.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status

from app.config import supabase_admin
from app.database import db_insert, db_select
from app.middleware.auth_middleware import get_current_user
from app.models.insight import (
    ChatRequest,
    ChatResponse,
    InsightResponse,
    InsightType,
    PatternAlert,
    WeeklyReport,
)
from app.models.user import TokenData
from app.services.ai_service import AIService
from app.services.memory_service import MemoryService
from app.services.wellness_service import WellnessService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Core"])

_ai = AIService()
_memories = MemoryService()
_wellness = WellnessService()
_INSIGHT_TABLE = "insights"


@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with Lumina AI (memory-augmented)",
)
async def chat(
    payload: ChatRequest,
    current_user: TokenData = Depends(get_current_user),
) -> ChatResponse:
    """Send a message to Lumina AI and receive a context-aware reply.

    When ``include_memories=true``, the 10 most recent memories are
    injected as context so Claude can give personalised answers.

    Args:
        payload: ``ChatRequest`` with message and optional history.
        current_user: Injected from JWT.

    Returns:
        ``ChatResponse`` with Claude's reply and usage stats.
    """
    memory_context: list = []
    if payload.include_memories:
        memory_context = await _memories.get_recent_memories(
            user_id=current_user.user_id, limit=10
        )

    history = [
        {"role": m.role, "content": m.content}
        for m in payload.conversation_history
    ]

    result = await _ai.chat_with_memories(
        user_id=current_user.user_id,
        message=payload.message,
        memory_context=memory_context,
        conversation_history=history,
    )

    return ChatResponse(
        reply=result["reply"],
        memories_used=len(memory_context),
        tokens_used=result["tokens_used"],
    )


@router.post(
    "/insight/weekly",
    response_model=WeeklyReport,
    status_code=status.HTTP_200_OK,
    summary="Generate weekly life report",
)
async def generate_weekly_report(
    current_user: TokenData = Depends(get_current_user),
) -> WeeklyReport:
    """Trigger the AI to generate a personalised weekly life summary.

    Aggregates memories, mood data, and tasks from the past 7 days and
    sends them to Claude to produce a structured report.

    Args:
        current_user: Injected from JWT.

    Returns:
        ``WeeklyReport`` with narrative, highlights, and recommendations.
    """
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    # Gather data for the week
    memories = await db_select(
        supabase_admin,
        "memories",
        filters={"user_id": current_user.user_id},
        order_by="created_at desc",
        limit=50,
    )
    memories_this_week = [
        m for m in memories
        if m["created_at"] >= week_start.isoformat()
    ]

    mood_history = await _wellness.get_mood_history(
        user_id=current_user.user_id, limit=30
    )
    mood_this_week = [
        {"mood": m.mood, "logged_at": m.logged_at.isoformat()}
        for m in mood_history
        if m.logged_at >= week_start
    ]

    tasks = await db_select(
        supabase_admin,
        "tasks",
        filters={"user_id": current_user.user_id},
        order_by="created_at desc",
        limit=50,
    )
    tasks_this_week = [
        t for t in tasks
        if t["created_at"] >= week_start.isoformat()
    ]

    result = await _ai.generate_weekly_insight(
        user_id=current_user.user_id,
        memories=memories_this_week,
        mood_data=mood_this_week,
        tasks=tasks_this_week,
    )

    # Persist the insight
    insight_data = {
        "user_id": current_user.user_id,
        "insight_type": InsightType.WEEKLY_REPORT.value,
        "title": f"Weekly Report — {now.strftime('%B %d, %Y')}",
        "content": result["narrative"],
        "data_snapshot": {
            "highlights": result["highlights"],
            "recommendations": result["recommendations"],
        },
        "generated_at": now.isoformat(),
    }
    try:
        await db_insert(supabase_admin, _INSIGHT_TABLE, insight_data)
    except Exception as exc:
        logger.warning("Could not persist weekly insight: %s", exc)

    return WeeklyReport(
        week_start=week_start,
        week_end=now,
        narrative=result["narrative"],
        highlights=result["highlights"],
        recommendations=result["recommendations"],
        mood_summary={"avg": sum(m["mood"] for m in mood_this_week) / len(mood_this_week) if mood_this_week else None},
        task_summary={
            "total": len(tasks_this_week),
            "completed": sum(1 for t in tasks_this_week if t.get("status") == "done"),
        },
    )


@router.post(
    "/insight/mood-pattern",
    response_model=PatternAlert,
    status_code=status.HTTP_200_OK,
    summary="Analyse mood patterns with AI",
)
async def analyze_mood_pattern(
    current_user: TokenData = Depends(get_current_user),
) -> PatternAlert:
    """Detect emotional patterns in the user's mood history using Claude.

    Fetches up to 30 days of mood data and asks Claude to identify trends,
    risks, or positive momentum.

    Args:
        current_user: Injected from JWT.

    Returns:
        ``PatternAlert`` with pattern type, severity, and action recommendation.
    """
    mood_history = await _wellness.get_mood_history(
        user_id=current_user.user_id, limit=30
    )
    mood_dicts = [
        {"mood": m.mood, "logged_at": m.logged_at.isoformat(), "note": m.note}
        for m in mood_history
    ]

    result = await _ai.analyze_mood_pattern(mood_history=mood_dicts)

    return PatternAlert(
        pattern_type=result.get("pattern_type", "stable"),
        severity=result.get("severity", "low"),
        title=result.get("title", "Mood Analysis"),
        description=result.get("description", ""),
        suggested_action=result.get("suggested_action", ""),
        detected_at=datetime.now(timezone.utc),
    )


@router.get(
    "/insight/history",
    response_model=list[InsightResponse],
    status_code=status.HTTP_200_OK,
    summary="Get AI insight history",
)
async def get_insight_history(
    current_user: TokenData = Depends(get_current_user),
) -> list[InsightResponse]:
    """Return previously generated AI insights for the authenticated user.

    Args:
        current_user: Injected from JWT.

    Returns:
        List of ``InsightResponse`` objects, newest first.
    """
    rows = await db_select(
        supabase_admin,
        _INSIGHT_TABLE,
        filters={"user_id": current_user.user_id},
        order_by="generated_at desc",
        limit=20,
    )
    return [
        InsightResponse(
            id=r["id"],
            user_id=r["user_id"],
            insight_type=InsightType(r["insight_type"]),
            title=r["title"],
            content=r["content"],
            data_snapshot=r.get("data_snapshot") or {},
            generated_at=datetime.fromisoformat(
                r["generated_at"].replace("Z", "+00:00")
            ),
        )
        for r in rows
    ]
