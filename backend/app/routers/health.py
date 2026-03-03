"""
Lumina Life OS — Health & Nutrition Router

Handles nutrition logging, daily calorie tracking, and AI food analysis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status

from app.config import supabase_admin
from app.database import db_delete, db_insert, db_select
from app.middleware.auth_middleware import get_current_user
from app.models.user import TokenData
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health Module"])

_NUTRITION_TABLE = "nutrition_logs"


# ── Pydantic Models ───────────────────────────────────────────────────────────

class NutritionCreate(BaseModel):
    food_name: str
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float | None = None
    serving_size: str | None = None
    meal_type: str = "snack"
    health_score: int | None = None


class NutritionResponse(NutritionCreate):
    id: str
    user_id: str
    created_at: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/nutrition",
    status_code=status.HTTP_201_CREATED,
    summary="Log a nutrition entry",
)
async def log_nutrition(
    payload: NutritionCreate,
    current_user: TokenData = Depends(get_current_user),
) -> dict:
    """Save a food/nutrition log entry for today."""
    row = {
        "user_id": current_user.user_id,
        "food_name": payload.food_name,
        "calories": payload.calories,
        "protein": payload.protein,
        "carbs": payload.carbs,
        "fat": payload.fat,
        "fiber": payload.fiber,
        "serving_size": payload.serving_size,
        "meal_type": payload.meal_type,
        "health_score": payload.health_score,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db_insert(supabase_admin, _NUTRITION_TABLE, row)
    return result


@router.get(
    "/nutrition/today",
    summary="Get today's nutrition log",
)
async def get_today_nutrition(
    current_user: TokenData = Depends(get_current_user),
) -> list[dict]:
    """Return all nutrition entries for today."""
    today = datetime.now(timezone.utc).date().isoformat()
    rows = await db_select(
        supabase_admin,
        _NUTRITION_TABLE,
        filters={"user_id": current_user.user_id},
        order_by="created_at",
    )
    return [r for r in rows if r.get("created_at", "").startswith(today)]


@router.get(
    "/nutrition/history",
    summary="Get nutrition history",
)
async def get_nutrition_history(
    current_user: TokenData = Depends(get_current_user),
) -> list[dict]:
    """Return last 30 days of nutrition entries."""
    rows = await db_select(
        supabase_admin,
        _NUTRITION_TABLE,
        filters={"user_id": current_user.user_id},
        order_by="created_at",
        limit=200,
    )
    return rows


@router.delete(
    "/nutrition/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a nutrition entry",
)
async def delete_nutrition(
    entry_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> None:
    """Delete a specific nutrition log entry."""
    try:
        await db_delete(supabase_admin, _NUTRITION_TABLE, entry_id, user_id=current_user.user_id)
    except Exception as e:
        logger.error("Failed to delete nutrition entry %s: %s", entry_id, e)
