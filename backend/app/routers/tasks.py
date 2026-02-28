"""
Lumina Life OS — Tasks Router (Life Module)
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

CRUD + completion + filtering endpoints for the task management module.
All routes require authentication and enforce user data isolation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import supabase_admin
from app.database import db_delete, db_insert, db_select, db_select_one, db_update
from app.middleware.auth_middleware import get_current_user
from app.models.task import TaskCreate, TaskPriority, TaskResponse, TaskStatus, TaskUpdate
from app.models.user import TokenData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["Tasks — Life Module"])

_TABLE = "tasks"


def _row_to_task(row: dict) -> TaskResponse:
    """Map a raw Supabase row dict to a ``TaskResponse``.

    Args:
        row: Raw database row.

    Returns:
        Populated ``TaskResponse``.
    """
    return TaskResponse(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        description=row.get("description"),
        priority=TaskPriority(row["priority"]),
        status=TaskStatus(row["status"]),
        due_date=row.get("due_date"),
        completed_at=row.get("completed_at"),
        tags=row.get("tags") or [],
        is_recurring=row.get("is_recurring", False),
        recurrence_rule=row.get("recurrence_rule"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get(
    "",
    response_model=list[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tasks",
)
async def list_tasks(
    task_status: TaskStatus | None = Query(None, alias="status"),
    priority: TaskPriority | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: TokenData = Depends(get_current_user),
) -> list[TaskResponse]:
    """Return paginated tasks for the authenticated user.

    Args:
        task_status: Optional status filter.
        priority: Optional priority filter.
        limit: Page size.
        offset: Pagination offset.
        current_user: Injected from JWT.

    Returns:
        List of ``TaskResponse`` objects, newest first.
    """
    filters: dict = {"user_id": current_user.user_id}
    if task_status:
        filters["status"] = task_status.value
    if priority:
        filters["priority"] = priority.value

    rows = await db_select(
        supabase_admin, _TABLE, filters=filters, order_by="created_at desc",
        limit=limit, offset=offset
    )
    return [_row_to_task(r) for r in rows]


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
)
async def create_task(
    payload: TaskCreate,
    current_user: TokenData = Depends(get_current_user),
) -> TaskResponse:
    """Create a task in the authenticated user's task list.

    Args:
        payload: ``TaskCreate`` body.
        current_user: Injected from JWT.

    Returns:
        The created ``TaskResponse``.
    """
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "user_id": current_user.user_id,
        "title": payload.title,
        "description": payload.description,
        "priority": payload.priority.value,
        "status": TaskStatus.TODO.value,
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
        "tags": payload.tags,
        "is_recurring": payload.is_recurring,
        "recurrence_rule": payload.recurrence_rule,
        "created_at": now,
        "updated_at": now,
    }
    row = await db_insert(supabase_admin, _TABLE, data)
    return _row_to_task(row)


@router.get(
    "/today",
    response_model=list[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="Get tasks due today",
)
async def get_today_tasks(
    current_user: TokenData = Depends(get_current_user),
) -> list[TaskResponse]:
    """Return all non-completed tasks due on today's date.

    Args:
        current_user: Injected from JWT.

    Returns:
        Tasks due today ordered by priority.
    """
    today = datetime.now(timezone.utc).date().isoformat()
    try:
        response = (
            supabase_admin.table(_TABLE)
            .select("*")
            .eq("user_id", current_user.user_id)
            .gte("due_date", f"{today}T00:00:00")
            .lt("due_date", f"{today}T23:59:59")
            .neq("status", TaskStatus.DONE.value)
            .neq("status", TaskStatus.CANCELLED.value)
            .execute()
        )
        return [_row_to_task(r) for r in (response.data or [])]
    except Exception as exc:
        logger.error("get_today_tasks failed: %s", exc)
        return []


@router.get(
    "/upcoming",
    response_model=list[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="Get upcoming tasks (next 7 days)",
)
async def get_upcoming_tasks(
    days: int = Query(7, ge=1, le=30, description="Look-ahead window in days"),
    current_user: TokenData = Depends(get_current_user),
) -> list[TaskResponse]:
    """Return incomplete tasks with due dates in the next N days.

    Args:
        days: Number of days ahead to look.
        current_user: Injected from JWT.

    Returns:
        Upcoming tasks sorted by due date.
    """
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    future = (now + timedelta(days=days)).isoformat()

    try:
        response = (
            supabase_admin.table(_TABLE)
            .select("*")
            .eq("user_id", current_user.user_id)
            .gte("due_date", now.isoformat())
            .lte("due_date", future)
            .neq("status", TaskStatus.DONE.value)
            .neq("status", TaskStatus.CANCELLED.value)
            .order("due_date")
            .execute()
        )
        return [_row_to_task(r) for r in (response.data or [])]
    except Exception as exc:
        logger.error("get_upcoming_tasks failed: %s", exc)
        return []


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a task",
)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: TokenData = Depends(get_current_user),
) -> TaskResponse:
    """Apply a partial update to a task.

    Args:
        task_id: UUID of the task.
        payload: ``TaskUpdate`` fields.
        current_user: Injected from JWT.

    Returns:
        Updated ``TaskResponse``.

    Raises:
        HTTPException: 404 if not found; 403 if not owned by user.
    """
    # Verify ownership
    existing = await db_select_one(supabase_admin, _TABLE, {"id": task_id, "user_id": current_user.user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.priority is not None:
        updates["priority"] = payload.priority.value
    if payload.status is not None:
        updates["status"] = payload.status.value
    if payload.due_date is not None:
        updates["due_date"] = payload.due_date.isoformat()
    if payload.tags is not None:
        updates["tags"] = payload.tags
    if payload.is_recurring is not None:
        updates["is_recurring"] = payload.is_recurring
    if payload.recurrence_rule is not None:
        updates["recurrence_rule"] = payload.recurrence_rule

    row = await db_update(supabase_admin, _TABLE, task_id, updates)
    return _row_to_task(row)


@router.patch(
    "/{task_id}/complete",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a task as complete",
)
async def complete_task(
    task_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> TaskResponse:
    """Toggle a task to ``done`` status and record the completion timestamp.

    Args:
        task_id: UUID of the task to complete.
        current_user: Injected from JWT.

    Returns:
        Updated ``TaskResponse`` with ``status=done``.

    Raises:
        HTTPException: 404 if not found.
    """
    existing = await db_select_one(supabase_admin, _TABLE, {"id": task_id, "user_id": current_user.user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    now = datetime.now(timezone.utc).isoformat()
    row = await db_update(supabase_admin, _TABLE, task_id, {
        "status": TaskStatus.DONE.value,
        "completed_at": now,
        "updated_at": now,
    })
    return _row_to_task(row)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
)
async def delete_task(
    task_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> None:
    """Permanently delete a task.

    Args:
        task_id: UUID of the task.
        current_user: Injected from JWT.

    Raises:
        HTTPException: 404 if not found.
    """
    existing = await db_select_one(supabase_admin, _TABLE, {"id": task_id, "user_id": current_user.user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await db_delete(supabase_admin, _TABLE, task_id, user_id=current_user.user_id)
