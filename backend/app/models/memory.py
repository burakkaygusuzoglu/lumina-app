"""
Lumina Life OS — Memory Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Memories are the core data unit of Lumina — every note, thought, journal entry,
task log, or wellness check-in is stored as a Memory and indexed for AI recall.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class MemoryType(str, Enum):
    """Category of a memory entry.

    Each type maps to a Lumina module:
    - ``note``      → Mind module
    - ``idea``      → Mind module
    - ``voice``     → Mind module (transcribed)
    - ``journal``   → Journal module
    - ``wellness``  → Wellness module auto-entries
    - ``task``      → Life module task completions
    """

    NOTE = "note"
    IDEA = "idea"
    VOICE = "voice"
    JOURNAL = "journal"
    WELLNESS = "wellness"
    TASK = "task"
    EXPERIENCE = "experience"
    DREAM = "dream"
    GOAL = "goal"
    GRATITUDE = "gratitude"


class MemoryCreate(BaseModel):
    """Payload for creating a new memory.

    Attributes:
        title: Short descriptor shown in lists (optional for quick notes).
        content: Full text content of the memory.
        memory_type: Category from ``MemoryType`` enum.
        tags: Free-form labels for organisation.
        metadata: Arbitrary JSON for module-specific extra data.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(None, max_length=255, description="Optional title / headline")
    content: str = Field(..., min_length=1, description="Full text content")
    memory_type: MemoryType = Field(default=MemoryType.NOTE)
    tags: list[str] = Field(default_factory=list, description="Organisational tags")
    metadata: dict = Field(default_factory=dict, description="Module-specific extra data")


class MemoryUpdate(BaseModel):
    """Partial update payload for an existing memory.

    All fields are optional — only provided fields are updated.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(None, max_length=255)
    content: str | None = Field(None, min_length=1)
    memory_type: MemoryType | None = None
    tags: list[str] | None = None
    metadata: dict | None = None
    is_pinned: bool | None = None


class MemoryResponse(BaseModel):
    """Full representation of a memory returned from the API.

    Attributes:
        id: UUID primary key.
        user_id: Owner's UUID.
        title: Optional title.
        content: Full text content.
        memory_type: Category.
        tags: Labels.
        metadata: Extra data dict.
        is_pinned: Whether pinned to top.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str | None = None
    content: str
    memory_type: MemoryType
    tags: list[str] = []
    metadata: dict = {}
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime


class MemorySearchResult(BaseModel):
    """Memory with a relevance score from semantic search.

    Attributes:
        memory: The matched memory.
        score: Cosine similarity score (0-1, higher is more relevant).
    """

    memory: MemoryResponse
    score: float = Field(ge=0.0, le=1.0)


class OnThisDayResponse(BaseModel):
    """Memories from the same calendar date in previous years.

    Attributes:
        memories: Matching memories grouped by year.
        years_back: How many years ago the earliest entry is.
    """

    memories: list[MemoryResponse]
    years_back: int
