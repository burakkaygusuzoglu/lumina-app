"""
Lumina Life OS — Journal Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Handles AI-generated journal prompts, journal entries, and the
Time Capsule feature — letters to your future self.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.config import supabase_admin
from app.database import db_insert, db_select, db_select_one
from app.middleware.auth_middleware import get_current_user
from app.models.memory import MemoryCreate, MemoryType
from app.models.user import TokenData
from app.services.ai_service import AIService
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/journal", tags=["Journal Module"])

_ai = AIService()
_memories = MemoryService()
_CAPSULE_TABLE = "time_capsules"


# ── Inline request/response models ───────────────────────────────────────────

class JournalEntryCreate(BaseModel):
    """Journal entry creation payload."""
    content: str = Field(..., min_length=1, description="Journal entry text")
    prompt_used: str | None = Field(None, description="The AI prompt that inspired this entry")
    mood: int | None = Field(None, ge=1, le=8, description="Mood at time of writing (1-8)")
    tags: list[str] = Field(default_factory=list)


class JournalEntryResponse(BaseModel):
    """Journal entry returned from the API."""
    id: str
    user_id: str
    content: str
    prompt_used: str | None = None
    mood: int | None = None
    tags: list[str] = []
    created_at: datetime


class TimeCapsuleCreate(BaseModel):
    """Time capsule creation payload."""
    title: str = Field(..., max_length=255, description="Capsule title")
    letter: str = Field(..., min_length=10, description="Letter to your future self")
    open_date: datetime = Field(..., description="Date when the capsule can be revealed")
    tags: list[str] = Field(default_factory=list)


class TimeCapsuleResponse(BaseModel):
    """Time capsule returned from the API."""
    id: str
    user_id: str
    title: str
    letter: str | None = None  # Only populated when capsule is opened
    open_date: datetime
    is_opened: bool
    ai_response: str | None = None
    tags: list[str] = []
    created_at: datetime


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/prompt",
    status_code=status.HTTP_200_OK,
    summary="Get an AI-generated personalised journal prompt",
)
async def get_journal_prompt(
    mood: int | None = Query(None, ge=1, le=5, description="Current mood 1-5"),
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, str]:
    """Return a personalised journal prompt from Claude.

    The prompt is tailored to the user's current mood and recent memories.

    Args:
        mood: Optional current mood level 1-5.
        current_user: Injected from JWT.

    Returns:
        Dict with ``prompt`` key containing the generated question.
    """
    recent = await _memories.get_recent_memories(user_id=current_user.user_id, limit=5)
    prompt = await _ai.generate_journal_prompt(mood=mood, recent_memories=recent)
    return {"prompt": prompt}


@router.post(
    "/entry",
    response_model=JournalEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a journal entry",
)
async def create_journal_entry(
    payload: JournalEntryCreate,
    current_user: TokenData = Depends(get_current_user),
) -> JournalEntryResponse:
    """Persist a journal entry. Also creates a memory of type ``journal``.

    Args:
        payload: ``JournalEntryCreate`` body.
        current_user: Injected from JWT.

    Returns:
        The created ``JournalEntryResponse``.
    """
    # Create as a memory for AI context + cross-module access
    memory_payload = MemoryCreate(
        title=f"Journal — {datetime.now(timezone.utc).strftime('%B %d, %Y')}",
        content=payload.content,
        memory_type=MemoryType.JOURNAL,
        tags=payload.tags,
        metadata={"prompt_used": payload.prompt_used, "mood": payload.mood},
    )
    memory = await _memories.create_memory(
        user_id=current_user.user_id, payload=memory_payload
    )

    return JournalEntryResponse(
        id=memory.id,
        user_id=memory.user_id,
        content=memory.content,
        prompt_used=payload.prompt_used,
        mood=payload.mood,
        tags=payload.tags,
        created_at=memory.created_at,
    )


@router.get(
    "/entries",
    response_model=list[JournalEntryResponse],
    status_code=status.HTTP_200_OK,
    summary="List journal entries",
)
async def list_journal_entries(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: TokenData = Depends(get_current_user),
) -> list[JournalEntryResponse]:
    """Return paginated journal entries for the authenticated user.

    Fetches memories of type ``journal``.

    Args:
        limit: Page size.
        offset: Pagination offset.
        current_user: Injected from JWT.

    Returns:
        List of ``JournalEntryResponse`` objects, newest first.
    """
    memories = await _memories.get_memories(
        user_id=current_user.user_id,
        memory_type=MemoryType.JOURNAL,
        limit=limit,
        offset=offset,
    )
    return [
        JournalEntryResponse(
            id=m.id,
            user_id=m.user_id,
            content=m.content,
            prompt_used=m.metadata.get("prompt_used"),
            mood=m.metadata.get("mood"),
            tags=m.tags,
            created_at=m.created_at,
        )
        for m in memories
    ]


@router.post(
    "/timecapsule",
    response_model=TimeCapsuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a time capsule letter to your future self",
)
async def create_time_capsule(
    payload: TimeCapsuleCreate,
    current_user: TokenData = Depends(get_current_user),
) -> TimeCapsuleResponse:
    """Seal a time capsule letter that will be revealed on a future date.

    The letter content is not returned until the ``open_date`` has passed.

    Args:
        payload: ``TimeCapsuleCreate`` with letter and reveal date.
        current_user: Injected from JWT.

    Returns:
        ``TimeCapsuleResponse`` (letter hidden until open_date).
    """
    now = datetime.now(timezone.utc)
    if payload.open_date <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="open_date must be in the future",
        )

    data = {
        "user_id": current_user.user_id,
        "title": payload.title,
        "letter_encrypted": payload.letter,  # TODO: encrypt with EncryptionService
        "open_date": payload.open_date.isoformat(),
        "is_opened": False,
        "tags": payload.tags,
        "created_at": now.isoformat(),
    }
    row = await db_insert(supabase_admin, _CAPSULE_TABLE, data)

    return TimeCapsuleResponse(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        letter=None,  # Hidden until open_date
        open_date=datetime.fromisoformat(row["open_date"].replace("Z", "+00:00")),
        is_opened=False,
        tags=row.get("tags") or [],
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
    )


@router.get(
    "/timecapsule",
    response_model=list[TimeCapsuleResponse],
    status_code=status.HTTP_200_OK,
    summary="List time capsules (automatically reveals if date has passed)",
)
async def list_time_capsules(
    current_user: TokenData = Depends(get_current_user),
) -> list[TimeCapsuleResponse]:
    """Return all time capsules. Opened capsules include the letter and AI response.

    If a capsule's ``open_date`` has passed and it hasn't been opened yet,
    it is automatically revealed and an AI response is generated.

    Args:
        current_user: Injected from JWT.

    Returns:
        List of ``TimeCapsuleResponse`` objects.
    """
    rows = (
        supabase_admin.table(_CAPSULE_TABLE)
        .select("*")
        .eq("user_id", current_user.user_id)
        .order("open_date", desc=False)
        .execute()
    ).data or []

    now = datetime.now(timezone.utc)
    results: list[TimeCapsuleResponse] = []

    for row in rows:
        open_date = datetime.fromisoformat(row["open_date"].replace("Z", "+00:00"))
        is_opened = row.get("is_opened", False)
        letter: str | None = None
        ai_response: str | None = row.get("ai_response")

        # Auto-reveal if date has passed
        if open_date <= now and not is_opened:
            letter = row.get("letter_encrypted")  # TODO: decrypt
            # Generate AI time-capsule response
            years_later = now.year - datetime.fromisoformat(
                row["created_at"].replace("Z", "+00:00")
            ).year
            if letter:
                ai_response = await _ai.generate_time_capsule_response(
                    letter=letter, years_later=max(years_later, 1)
                )
            # Mark as opened
            supabase_admin.table(_CAPSULE_TABLE).update({
                "is_opened": True,
                "ai_response": ai_response,
            }).eq("id", row["id"]).execute()
            is_opened = True

        elif is_opened:
            letter = row.get("letter_encrypted")  # Already revealed

        results.append(TimeCapsuleResponse(
            id=row["id"],
            user_id=row["user_id"],
            title=row["title"],
            letter=letter,
            open_date=open_date,
            is_opened=is_opened,
            ai_response=ai_response,
            tags=row.get("tags") or [],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
        ))

    return results
