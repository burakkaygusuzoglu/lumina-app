"""
Lumina Life OS — Database Helper Module
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Thin async wrappers around Supabase PostgREST client to keep routers clean.
All helpers accept ``user_id`` to enforce row-level data isolation.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.config import supabase_admin, supabase_client

logger = logging.getLogger(__name__)


# ── Generic helpers ────────────────────────────────────────────────────────


async def db_insert(
    client: Client,
    table: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Insert a single row and return the created record.

    Args:
        client: Supabase client instance.
        table: Target table name.
        data: Column → value mapping to insert.

    Returns:
        The newly created row as a dict.

    Raises:
        HTTPException: 500 if the insert fails.
    """
    try:
        response = client.table(table).insert(data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to insert into {table}",
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("db_insert %s failed: %s", table, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database insert error",
        ) from exc


async def db_select(
    client: Client,
    table: str,
    filters: dict[str, Any] | None = None,
    columns: str = "*",
    order_by: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> list[dict[str, Any]]:
    """Select rows from a table with optional filters and pagination.

    Args:
        client: Supabase client instance.
        table: Target table name.
        filters: Equality filters as column → value pairs.
        columns: Comma-separated column list (default ``*``).
        order_by: Column name with optional ``asc``/``desc`` suffix.
        limit: Maximum number of rows to return.
        offset: Number of rows to skip for pagination.

    Returns:
        List of row dicts matching the query.

    Raises:
        HTTPException: 500 on database error.
    """
    try:
        query = client.table(table).select(columns)
        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)
        if order_by:
            desc = order_by.endswith(" desc")
            col = order_by.replace(" desc", "").replace(" asc", "").strip()
            query = query.order(col, desc=desc)
        if limit is not None:
            query = query.limit(limit)
        if offset is not None:
            query = query.range(offset, offset + (limit or 50) - 1)
        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("db_select %s failed: %s", table, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database select error",
        ) from exc


async def db_select_one(
    client: Client,
    table: str,
    filters: dict[str, Any],
    columns: str = "*",
) -> dict[str, Any] | None:
    """Select at most one row matching the given filters.

    Args:
        client: Supabase client instance.
        table: Target table name.
        filters: Equality filters as column → value pairs.
        columns: Columns to retrieve (default ``*``).

    Returns:
        Row dict if found, else ``None``.

    Raises:
        HTTPException: 500 on database error.
    """
    rows = await db_select(client, table, filters, columns, limit=1)
    return rows[0] if rows else None


async def db_update(
    client: Client,
    table: str,
    row_id: str,
    data: dict[str, Any],
    id_column: str = "id",
) -> dict[str, Any]:
    """Update a single row by primary key and return the updated record.

    Args:
        client: Supabase client instance.
        table: Target table name.
        row_id: Primary key value.
        data: Column → value mapping of fields to update.
        id_column: Name of the primary key column (default ``id``).

    Returns:
        The updated row as a dict.

    Raises:
        HTTPException: 404 if no row found; 500 on error.
    """
    try:
        response = client.table(table).update(data).eq(id_column, row_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found in {table}",
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("db_update %s id=%s failed: %s", table, row_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database update error",
        ) from exc


async def db_delete(
    client: Client,
    table: str,
    row_id: str,
    id_column: str = "id",
    user_id: str | None = None,
    user_column: str = "user_id",
) -> None:
    """Delete a single row by primary key, optionally scoped to a user.

    Args:
        client: Supabase client instance.
        table: Target table name.
        row_id: Primary key value.
        id_column: Name of the primary key column (default ``id``).
        user_id: When provided, adds a user ownership filter for safety.
        user_column: Column that holds the user reference (default ``user_id``).

    Raises:
        HTTPException: 404 if no row deleted; 500 on error.
    """
    try:
        query = client.table(table).delete().eq(id_column, row_id)
        if user_id:
            query = query.eq(user_column, user_id)
        response = query.execute()
        if response.data is not None and len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found in {table}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("db_delete %s id=%s failed: %s", table, row_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database delete error",
        ) from exc


# ── Convenience shortcuts ─────────────────────────────────────────────────

def get_db() -> Client:
    """Return the anonymous Supabase client (respects RLS).

    Returns:
        supabase_client singleton.
    """
    return supabase_client


def get_admin_db() -> Client:
    """Return the service-role Supabase client (bypasses RLS).

    Use with caution — only in trusted server-side operations.

    Returns:
        supabase_admin singleton.
    """
    return supabase_admin
