"""
Lumina Life OS — Task Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class TaskPriority(str, Enum):
    """Task urgency / importance level.

    Maps to Eisenhower-style quadrants:
    - ``low``      → Not urgent, not important
    - ``medium``   → Not urgent, important
    - ``high``     → Urgent, important
    - ``critical`` → Blocking / must do today
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    """Lifecycle state of a task."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskCreate(BaseModel):
    """Payload for creating a new task.

    Attributes:
        title: Short action-oriented description.
        description: Longer context or acceptance criteria.
        priority: Urgency level from ``TaskPriority``.
        due_date: Optional deadline for the task.
        tags: Category labels.
        is_recurring: Whether the task repeats.
        recurrence_rule: iCal RRULE string if recurring.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: datetime | None = None
    tags: list[str] = Field(default_factory=list)
    is_recurring: bool = False
    recurrence_rule: str | None = Field(None, description="iCal RRULE string")


class TaskUpdate(BaseModel):
    """Partial update payload for an existing task."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_date: datetime | None = None
    tags: list[str] | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None


class TaskResponse(BaseModel):
    """Full task representation returned from the API.

    Attributes:
        id: UUID primary key.
        user_id: Owner's UUID.
        title: Task title.
        description: Optional details.
        priority: Urgency value.
        status: Lifecycle state.
        due_date: Optional deadline.
        completed_at: Timestamp when marked complete.
        tags: Labels.
        is_recurring: Recurrence flag.
        recurrence_rule: iCal RRULE if recurring.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    description: str | None = None
    priority: TaskPriority
    status: TaskStatus
    due_date: datetime | None = None
    completed_at: datetime | None = None
    tags: list[str] = []
    is_recurring: bool = False
    recurrence_rule: str | None = None
    created_at: datetime
    updated_at: datetime
