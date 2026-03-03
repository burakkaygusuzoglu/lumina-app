"""
Lumina Life OS — Vault Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Encrypted secret storage for passwords, API keys and private notes.
Sensitive fields are encrypted at rest with AES-256-GCM.
Only the item owner can decrypt — encryption happens server-side using
the ``EncryptionService``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import supabase_admin
from app.database import db_delete, db_insert, db_select, db_select_one, db_update
from app.middleware.auth_middleware import get_current_user
from app.models.user import TokenData
from app.models.vault import VaultItemCreate, VaultItemResponse, VaultItemType, VaultItemUpdate
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vault", tags=["Vault Module"])

_TABLE = "vault_items"
_enc = EncryptionService()


def _encrypt_sensitive(payload: VaultItemCreate | VaultItemUpdate) -> dict:
    """Build a database-ready dict with sensitive fields encrypted.

    Args:
        payload: Create or update payload.

    Returns:
        Dict with ``password`` and ``notes`` encrypted (if present).
    """
    data: dict = {}
    if hasattr(payload, "name") and payload.name is not None:
        data["name"] = payload.name
    if hasattr(payload, "item_type") and payload.item_type is not None:
        data["item_type"] = payload.item_type.value
    if payload.username is not None:
        data["username"] = payload.username
    if payload.url is not None:
        data["url"] = payload.url

    # Encrypt secrets
    if payload.password is not None:
        data["password_encrypted"] = _enc.encrypt(payload.password)
    if payload.notes is not None:
        data["notes_encrypted"] = _enc.encrypt(payload.notes)

    return data


def _row_to_response(row: dict, include_secrets: bool = False) -> VaultItemResponse:
    """Convert a raw row to a VaultItemResponse.

    Args:
        row: Raw database row dict.
        include_secrets: When ``True``, decrypt and populate password/notes.

    Returns:
        ``VaultItemResponse`` (secrets omitted unless ``include_secrets=True``).
    """
    decrypted_password: str | None = None
    decrypted_notes: str | None = None

    if include_secrets:
        if row.get("password_encrypted"):
            decrypted_password = _enc.decrypt(row["password_encrypted"])
        if row.get("notes_encrypted"):
            decrypted_notes = _enc.decrypt(row["notes_encrypted"])

    return VaultItemResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        item_type=VaultItemType(row["item_type"]),
        username=row.get("username"),
        password=decrypted_password,
        url=row.get("url"),
        notes=decrypted_notes,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get(
    "/{item_id}",
    response_model=VaultItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single vault item with secrets",
)
async def get_vault_item(
    item_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> VaultItemResponse:
    row = await db_select_one(supabase_admin, _TABLE, {"id": item_id, "user_id": current_user.user_id})
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return _row_to_response(row, include_secrets=True)

@router.get(
    "",
    response_model=list[VaultItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List vault items (secrets redacted)",
)
async def list_vault_items(
    current_user: TokenData = Depends(get_current_user),
) -> list[VaultItemResponse]:
    """Return all vault items for the user. Secrets are NOT included in this list.

    Use ``GET /vault/{id}`` to fetch decrypted values for a specific item.

    Args:
        current_user: Injected from JWT.

    Returns:
        List of ``VaultItemResponse`` with ``password`` and ``notes`` as ``None``.
    """
    rows = await db_select(
        supabase_admin, _TABLE, {"user_id": current_user.user_id}, order_by="name asc"
    )
    return [_row_to_response(r, include_secrets=False) for r in rows]


@router.post(
    "",
    response_model=VaultItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store a new encrypted vault item",
)
async def create_vault_item(
    payload: VaultItemCreate,
    current_user: TokenData = Depends(get_current_user),
) -> VaultItemResponse:
    """Encrypt and persist a new vault item.

    The ``password`` and ``notes`` fields are encrypted using AES-256-GCM
    before being written to the database.

    Args:
        payload: ``VaultItemCreate`` body.
        current_user: Injected from JWT.

    Returns:
        ``VaultItemResponse`` (secrets NOT included in creation response).
    """
    now = datetime.now(timezone.utc).isoformat()
    data = _encrypt_sensitive(payload)
    data.update({
        "user_id": current_user.user_id,
        "created_at": now,
        "updated_at": now,
    })
    row = await db_insert(supabase_admin, _TABLE, data)
    return _row_to_response(row, include_secrets=False)


@router.get(
    "/{item_id}",
    response_model=VaultItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a vault item with decrypted secrets",
)
async def get_vault_item(
    item_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> VaultItemResponse:
    """Fetch a single vault item and return decrypted secrets.

    Args:
        item_id: UUID of the vault item.
        current_user: Injected from JWT.

    Returns:
        ``VaultItemResponse`` with ``password`` and ``notes`` decrypted.

    Raises:
        HTTPException: 404 if not found or not owned by user.
    """
    row = await db_select_one(
        supabase_admin, _TABLE, {"id": item_id, "user_id": current_user.user_id}
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault item not found")
    return _row_to_response(row, include_secrets=True)


@router.put(
    "/{item_id}",
    response_model=VaultItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a vault item",
)
async def update_vault_item(
    item_id: str,
    payload: VaultItemUpdate,
    current_user: TokenData = Depends(get_current_user),
) -> VaultItemResponse:
    """Update a vault item's data (re-encrypts any changed secrets).

    Args:
        item_id: UUID of the vault item.
        payload: ``VaultItemUpdate`` partial body.
        current_user: Injected from JWT.

    Returns:
        Updated ``VaultItemResponse`` (secrets redacted).

    Raises:
        HTTPException: 404 if not found.
    """
    existing = await db_select_one(
        supabase_admin, _TABLE, {"id": item_id, "user_id": current_user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault item not found")

    updates = _encrypt_sensitive(payload)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    row = await db_update(supabase_admin, _TABLE, item_id, updates)
    return _row_to_response(row, include_secrets=False)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vault item",
)
async def delete_vault_item(
    item_id: str,
    current_user: TokenData = Depends(get_current_user),
) -> None:
    """Permanently delete a vault item.

    Args:
        item_id: UUID of the vault item.
        current_user: Injected from JWT.

    Raises:
        HTTPException: 404 if not found.
    """
    existing = await db_select_one(
        supabase_admin, _TABLE, {"id": item_id, "user_id": current_user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault item not found")
    await db_delete(supabase_admin, _TABLE, item_id, user_id=current_user.user_id)
