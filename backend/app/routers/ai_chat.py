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
from pydantic import BaseModel

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


class DailyBriefingResponse(BaseModel):
    briefing: str

@router.get(
    "/insight/daily",
    response_model=DailyBriefingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate proactive daily briefing",
)
async def generate_daily_briefing(
    current_user: TokenData = Depends(get_current_user),
) -> DailyBriefingResponse:
    """Trigger the AI to generate a highly proactive morning briefing."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    day_start = now - timedelta(hours=24)

    try:
        tasks = await db_select(
            supabase_admin,
            "tasks",
            filters={"user_id": current_user.user_id},
            order_by="created_at desc",
            limit=20,
        )
    except Exception:
        tasks = []
        
    try:
        sleep_rows = await db_select(
            supabase_admin, "sleep_entries", {"user_id": current_user.user_id}, "created_at desc", 1
        )
        sleep_data = sleep_rows[0] if sleep_rows else None
    except Exception:
        sleep_data = None

    briefing = await _ai.generate_daily_proactive_insight(
        user_id=current_user.user_id,
        tasks=tasks,
        sleep_data=sleep_data,
        nutrition_data=None 
    )

    return DailyBriefingResponse(briefing=briefing)


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
    "/greeting",
    status_code=status.HTTP_200_OK,
    summary="Get personalised daily greeting (cached 1 h)",
)
async def get_daily_greeting(
    current_user: TokenData = Depends(get_current_user),
) -> dict:
    """Return an AI-generated personalised greeting for the current user.

    The response is cached in the insights table for 1 hour to avoid
    redundant Anthropic calls on every page refresh.

    Args:
        current_user: Injected from JWT.

    Returns:
        Dict with ``greeting`` str and ``cached`` bool.
    """
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)

    # Check for cached greeting from last hour
    cached_rows = await db_select(
        supabase_admin,
        _INSIGHT_TABLE,
        filters={"user_id": current_user.user_id, "insight_type": InsightType.GREETING.value},
        order_by="generated_at desc",
        limit=1,
    )
    if cached_rows:
        cached_at_str = cached_rows[0]["generated_at"].replace("Z", "+00:00")
        cached_at = datetime.fromisoformat(cached_at_str)
        if cached_at > one_hour_ago:
            return {"greeting": cached_rows[0]["content"], "cached": True}

    # Fetch context data
    mood_history = await _wellness.get_mood_history(user_id=current_user.user_id, limit=7)
    mood_dicts = [{"mood": m.mood, "logged_at": m.logged_at.isoformat()} for m in mood_history]

    tasks = await db_select(
        supabase_admin, "tasks",
        filters={"user_id": current_user.user_id},
        order_by="created_at desc", limit=20,
    )
    tasks_today = [t for t in tasks if not t.get("is_completed")][:5]

    journals = await db_select(
        supabase_admin, "journal_entries",
        filters={"user_id": current_user.user_id},
        order_by="created_at desc", limit=1,
    )
    snippet = journals[0].get("content", "")[:120] if journals else None

    try:
        sleep_rows = await db_select(
            supabase_admin, "sleep_entries",
            filters={"user_id": current_user.user_id},
            order_by="date desc", limit=1,
        )
        sleep_data = sleep_rows[0] if sleep_rows else None
    except Exception:
        sleep_data = None

    first_name = "friend"
    try:
        user_resp = supabase_admin.auth.admin.get_user_by_id(current_user.user_id)
        if user_resp.user and user_resp.user.user_metadata:
            full = user_resp.user.user_metadata.get("full_name", "")
            first_name = full.split()[0] if full.strip() else "friend"
    except Exception:
        pass

    greeting = await _ai.generate_daily_greeting(
        user_name=first_name,
        mood_history=mood_dicts,
        tasks_today=tasks_today,
        last_journal_snippet=snippet,
        sleep_data=sleep_data,
    )

    # Cache the greeting
    try:
        await db_insert(supabase_admin, _INSIGHT_TABLE, {
            "user_id": current_user.user_id,
            "insight_type": InsightType.GREETING.value,
            "title": f"Greeting — {now.strftime('%B %d, %Y %H:%M')}",
            "content": greeting,
            "data_snapshot": {},
            "generated_at": now.isoformat(),
        })
    except Exception as exc:
        logger.warning("Could not cache greeting: %s", exc)

    return {"greeting": greeting, "cached": False}


@router.get(
    "/on-this-day",
    status_code=status.HTTP_200_OK,
    summary="Get 'On This Day' memory insight",
)
async def on_this_day(
    current_user: TokenData = Depends(get_current_user),
) -> dict:
    """Find memories from this exact calendar date in previous years.

    Generates a warm AI reflection if past memories are found.

    Args:
        current_user: Injected from JWT.

    Returns:
        Dict with ``memories`` (list), ``insight`` (str), and ``has_memories`` (bool).
    """
    now = datetime.now(timezone.utc)
    month_day = now.strftime("%m-%d")

    all_memories = await db_select(
        supabase_admin, "memories",
        filters={"user_id": current_user.user_id},
        order_by="created_at desc", limit=200,
    )

    past_memories = [
        m for m in all_memories
        if m.get("created_at", "")[:10][5:] == month_day
        and m.get("created_at", "")[:4] != str(now.year)
    ]

    if not past_memories:
        return {"memories": [], "insight": "", "has_memories": False}

    insight = await _ai.get_on_this_day_insight(memories_from_past_years=past_memories[:5])

    return {
        "memories": past_memories[:5],
        "insight": insight,
        "has_memories": True,
    }


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


# ── AI Food Analysis ──────────────────────────────────────────────────────────

class FoodAnalysisPayload(BaseModel):
    image_base64: str
    meal_type: str = "snack"


@router.post(
    "/analyze-food",
    status_code=status.HTTP_200_OK,
    summary="Analyze food image with AI (nutrition facts)",
)
async def analyze_food(
    payload: FoodAnalysisPayload,
    current_user: TokenData = Depends(get_current_user),
) -> dict:
    """Use Claude Vision to identify food and estimate nutritional values.

    Args:
        payload: Base64-encoded image and meal type.
        current_user: Injected from JWT.

    Returns:
        Dict with food_name, calories, protein, carbs, fat, tips.
    """
    import anthropic as _anthropic

    try:
        client = _ai._client
        response = client.messages.create(
            model=_ai._model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": payload.image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Analyze this food image and respond with ONLY valid JSON "
                                "(no markdown, no explanation) in this exact format:\n"
                                '{"food_name":"...","calories":0,"protein":0,"carbs":0,"fat":0,'
                                '"fiber":0,"serving_size":"...","health_score":8,'
                                '"tips":"brief 1-sentence health tip"}\n'
                                "Estimate values for a standard single serving."
                            ),
                        },
                    ],
                }
            ],
        )
        raw = response.content[0].text.strip() if response.content else "{}"
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        import json as _json
        result = _json.loads(raw)
        result["meal_type"] = payload.meal_type
        return result
    except Exception as exc:
        logger.error("analyze_food failed: %s", exc)
        return {
            "food_name": "Unknown Food",
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
            "meal_type": payload.meal_type,
            "tips": "Could not analyze the image. Please try again.",
        }
