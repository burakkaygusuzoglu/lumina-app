"""
Lumina Life OS — Memory Service
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Full CRUD operations for the memories table in Supabase.
Also provides keyword-based search and "On This Day" retrieval.
Semantic (vector) search is prepared and will activate when
the Pinecone key is configured.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.config import supabase_admin
from app.database import db_delete, db_insert, db_select, db_select_one, db_update
from app.models.memory import MemoryCreate, MemoryResponse, MemoryType, MemoryUpdate

logger = logging.getLogger(__name__)

_TABLE = "memories"


class MemoryService:
    """Provides CRUD and search operations for user memories.

    All methods enforce user isolation — queries always filter by ``user_id``.
    """

    async def create_memory(
        self,
        user_id: str,
        payload: MemoryCreate,
    ) -> MemoryResponse:
        """Persist a new memory and return the created record.

        Args:
            user_id: UUID of the owning user.
            payload: Validated ``MemoryCreate`` schema.

        Returns:
            The created ``MemoryResponse``.
        """
        now = datetime.now(timezone.utc).isoformat()
        data = {
            "user_id": user_id,
            "title": payload.title,
            "content": payload.content,
            "memory_type": payload.memory_type.value,
            "tags": payload.tags,
            "metadata": payload.metadata,
            "is_pinned": False,
            "created_at": now,
            "updated_at": now,
        }
        row = await db_insert(supabase_admin, _TABLE, data)
        return MemoryResponse(**row)

    async def get_memories(
        self,
        user_id: str,
        memory_type: MemoryType | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[MemoryResponse]:
        """Retrieve a paginated list of memories for a user.

        Args:
            user_id: UUID of the requesting user.
            memory_type: Optional filter by type.
            limit: Maximum records to return.
            offset: Records to skip for pagination.

        Returns:
            List of ``MemoryResponse`` objects ordered by creation date descending.
        """
        filters: dict[str, Any] = {"user_id": user_id}
        if memory_type:
            filters["memory_type"] = memory_type.value

        rows = await db_select(
            supabase_admin,
            _TABLE,
            filters=filters,
            order_by="created_at desc",
            limit=limit,
            offset=offset,
        )
        return [MemoryResponse(**r) for r in rows]

    async def get_memory_by_id(
        self,
        user_id: str,
        memory_id: str,
    ) -> MemoryResponse:
        """Fetch a single memory by its ID, scoped to the user.

        Args:
            user_id: UUID of the requesting user.
            memory_id: UUID of the memory to fetch.

        Returns:
            The matching ``MemoryResponse``.

        Raises:
            HTTPException: 404 if not found or not owned by the user.
        """
        row = await db_select_one(
            supabase_admin, _TABLE, {"id": memory_id, "user_id": user_id}
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Memory not found",
            )
        return MemoryResponse(**row)

    async def update_memory(
        self,
        user_id: str,
        memory_id: str,
        payload: MemoryUpdate,
    ) -> MemoryResponse:
        """Apply a partial update to an existing memory.

        Args:
            user_id: UUID of the owning user.
            memory_id: UUID of the memory to update.
            payload: ``MemoryUpdate`` with only the fields to change.

        Returns:
            The updated ``MemoryResponse``.

        Raises:
            HTTPException: 404 if the memory is not found.
        """
        # Verify ownership before updating
        await self.get_memory_by_id(user_id, memory_id)

        updates: dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.content is not None:
            updates["content"] = payload.content
        if payload.memory_type is not None:
            updates["memory_type"] = payload.memory_type.value
        if payload.tags is not None:
            updates["tags"] = payload.tags
        if payload.metadata is not None:
            updates["metadata"] = payload.metadata
        if payload.is_pinned is not None:
            updates["is_pinned"] = payload.is_pinned

        row = await db_update(supabase_admin, _TABLE, memory_id, updates)
        return MemoryResponse(**row)

    async def delete_memory(
        self,
        user_id: str,
        memory_id: str,
    ) -> None:
        """Delete a memory, enforcing user ownership.

        Args:
            user_id: UUID of the owning user.
            memory_id: UUID of the memory to delete.

        Raises:
            HTTPException: 404 if not found or not owned by the user.
        """
        # Verify ownership first
        await self.get_memory_by_id(user_id, memory_id)
        await db_delete(supabase_admin, _TABLE, memory_id, user_id=user_id)

    async def search_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 10,
    ) -> list[MemoryResponse]:
        """Keyword-based full-text search over the user's memories.

        Uses Supabase's PostgreSQL ``ilike`` for case-insensitive substring
        matching.  Will be upgraded to vector search once Pinecone is connected.

        Args:
            user_id: UUID of the requesting user.
            query: Search string.
            limit: Maximum results to return.

        Returns:
            List of matching ``MemoryResponse`` objects.
        """
        if not query.strip():
            return []
        try:
            response = (
                supabase_admin
                .table(_TABLE)
                .select("*")
                .eq("user_id", user_id)
                .ilike("content", f"%{query}%")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return [MemoryResponse(**r) for r in (response.data or [])]
        except Exception as exc:
            logger.error("search_memories failed for user %s: %s", user_id, exc)
            return []

    async def get_on_this_day(
        self,
        user_id: str,
    ) -> list[MemoryResponse]:
        """Retrieve memories from the same month/day in previous years.

        Args:
            user_id: UUID of the requesting user.

        Returns:
            List of memories with matching month-day, oldest first.
        """
        today = datetime.now(timezone.utc)
        month_day = today.strftime("%m-%d")  # e.g. "02-14"

        try:
            # Filter by month-day pattern using Postgres to_char
            response = (
                supabase_admin
                .table(_TABLE)
                .select("*")
                .eq("user_id", user_id)
                .filter("created_at", "lt", today.replace(year=today.year).isoformat())
                .execute()
            )
            rows = response.data or []
            # Filter in Python for month-day match (avoids complex RPC)
            matching = [
                r for r in rows
                if datetime.fromisoformat(
                    r["created_at"].replace("Z", "+00:00")
                ).strftime("%m-%d") == month_day
            ]
            return [MemoryResponse(**r) for r in matching[:20]]
        except Exception as exc:
            logger.error("get_on_this_day failed for user %s: %s", user_id, exc)
            return []

    async def get_recent_memories(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Return recent memories as plain dicts for AI context injection.

        Args:
            user_id: UUID of the requesting user.
            limit: Number of memories to fetch.

        Returns:
            List of raw row dicts.
        """
        rows = await db_select(
            supabase_admin,
            _TABLE,
            filters={"user_id": user_id},
            order_by="created_at desc",
            limit=limit,
        )
        return rows
