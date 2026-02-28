"""
Lumina Life OS — Memories Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

CRUD + search endpoints for the Mind module.
All routes require authentication and enforce strict user isolation.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query, status

from app.middleware.auth_middleware import get_current_user
from app.models.memory import (
    MemoryCreate,
    MemoryResponse,
    MemoryType,
    MemoryUpdate,
    OnThisDayResponse,
)
from app.models.user import TokenData
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memories", tags=["Memories — Mind Module"])
_svc = MemoryService()


@router.get(
    "",
    response_model=list[MemoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List memories (paginated)",
)
async def list_memories(
    memory_type: MemoryType | None = Query(None, description="Filter by memory type"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    offset: int = Query(0, ge=0, description="Records to skip"),
    current_user: TokenData = Depends(get_current_user),
) -> list[MemoryResponse]:
    """Return a paginated list of the authenticated user's memories.

    Args:
        memory_type: Optional type filter.
        limit: Max records per page.
        offset: Pagination offset.
        current_user: Injected from JWT.

    Returns:
        List of ``MemoryResponse`` objects.
    """
    return await _svc.get_memories(
        user_id=current_user.user_id,
        memory_type=memory_type,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=MemoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new memory",
)
async def create_memory(
    payload: MemoryCreate,
    current_user: TokenData = Depends(get_current_user),
) -> MemoryResponse:
    """Persist a new memory entry.

    Args:
        payload: ``MemoryCreate`` body.
        current_user: Injected from JWT.

    Returns:
        The created ``MemoryResponse``.
    """
    return await _svc.create_memory(user_id=current_user.user_id, payload=payload)


@router.get(
    "/search",
    response_model=list[MemoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Search memories by keyword",
)
async def search_memories(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = Query(10, ge=1, le=50),
    current_user: TokenData = Depends(get_current_user),
) -> list[MemoryResponse]:
    """Full-text search over the user's memories.

    Args:
        q: Search query.
        limit: Max results.
        current_user: Injected from JWT.

    Returns:
        Matching memories ordered by relevance.
    """
    return await _svc.search_memories(
        user_id=current_user.user_id, query=q, limit=limit
    )


@router.get(
    "/onthisday",
    response_model=OnThisDayResponse,
    status_code=status.HTTP_200_OK,
    summary="Memories from the same day in past years",
)
async def on_this_day(
    current_user: TokenData = Depends(get_current_user),
) -> OnThisDayResponse:
    """Return memories created on today's month-day in previous years.

    Args:
        current_user: Injected from JWT.

    Returns:
        ``OnThisDayResponse`` with memories and years-back count.
    """
    memories = await _svc.get_on_this_day(user_id=current_user.user_id)
    years_back = 0
    if memories:
        from datetime import datetime, timezone
        earliest = min(memories, key=lambda m: m.created_at)
        years_back = datetime.now(timezone.utc).year - earliest.created_at.year
    return OnThisDayResponse(memories=memories, years_back=years_back)


@router.get(
    "/{memory_id}",
    response_model=MemoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a specific memory by ID",
)
async def get_memory(
    memory_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> MemoryResponse:
    """Fetch a single memory by its UUID.

    Args:
        memory_id: UUID of the memory.
        current_user: Injected from JWT.

    Returns:
        The matching ``MemoryResponse``.

    Raises:
        HTTPException: 404 if not found or not owned by the user.
    """
    return await _svc.get_memory_by_id(
        user_id=current_user.user_id, memory_id=memory_id
    )


@router.put(
    "/{memory_id}",
    response_model=MemoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing memory",
)
async def update_memory(
    memory_id: str,
    payload: MemoryUpdate,
    current_user: TokenData = Depends(get_current_user),
) -> MemoryResponse:
    """Apply a partial update to a memory.

    Args:
        memory_id: UUID of the memory to update.
        payload: Fields to update.
        current_user: Injected from JWT.

    Returns:
        The updated ``MemoryResponse``.
    """
    return await _svc.update_memory(
        user_id=current_user.user_id, memory_id=memory_id, payload=payload
    )


@router.delete(
    "/{memory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a memory",
)
async def delete_memory(
    memory_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> None:
    """Permanently delete a memory.

    Args:
        memory_id: UUID of the memory to delete.
        current_user: Injected from JWT.

    Raises:
        HTTPException: 404 if not found or not owned by the user.
    """
    await _svc.delete_memory(user_id=current_user.user_id, memory_id=memory_id)
