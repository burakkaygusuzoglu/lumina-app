"""
Lumina Life OS — Vault Router
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Encrypted secret storage for passwords, API keys and private notes.
Sensitive fields are encrypted at rest with AES-256-GCM.
Only the item owner can decrypt — encryption happens server-side using
the ``EncryptionService``.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import supabase_admin
from app.database import db_delete, db_insert, db_select, db_select_one, db_update
from app.middleware.auth_middleware import get_current_user
from app.models.user import TokenData
from app.models.vault import VaultItemCreate, VaultItemResponse, VaultItemUpdate
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vault", tags=["Vault Module"])

_TABLE = "vault_items"
_enc = EncryptionService()


def _build_notes_payload(payload: VaultItemCreate | VaultItemUpdate) -> str | None:
    """Pack content + card fields into a single JSON string for encryption.

    For ``card`` category items the card_number, expiry and cvv are
    bundled together with any plain content so they are all encrypted
    in one ``notes_encrypted`` column.

    Args:
        payload: Create or update payload.

    Returns:
        JSON string if any notes-related field is present, else ``None``.
    """
    category = getattr(payload, "category", None) or ""
    content  = getattr(payload, "content", None)
    card_num = getattr(payload, "card_number", None)
    expiry   = getattr(payload, "expiry", None)
    cvv      = getattr(payload, "cvv", None)

    if category == "card" and any([card_num, expiry, cvv, content]):
        return json.dumps({
            "content":     content or "",
            "card_number": card_num or "",
            "expiry":      expiry or "",
            "cvv":         cvv or "",
        })

    return content  # plain string or None


def _encrypt_sensitive(payload: VaultItemCreate | VaultItemUpdate) -> dict:
    """Build a database-ready dict with sensitive fields encrypted.

    Args:
        payload: Create or update payload.

    Returns:
        Dict with ``password_encrypted`` and ``notes_encrypted`` where present.
    """
    data: dict = {}

    # Map new frontend field names to DB column names
    title = getattr(payload, "title", None)
    category = getattr(payload, "category", None)

    if title is not None:
        data["name"] = title
    if category is not None:
        data["item_type"] = category
    if getattr(payload, "username", None) is not None:
        data["username"] = payload.username
    if getattr(payload, "url", None) is not None:
        data["url"] = payload.url

    # Encrypt password
    if getattr(payload, "password", None) is not None:
        data["password_encrypted"] = _enc.encrypt(payload.password)

    # Encrypt notes (content + card fields packed together)
    notes_str = _build_notes_payload(payload)
    if notes_str is not None:
        data["notes_encrypted"] = _enc.encrypt(notes_str)

    return data


def _row_to_response(row: dict, include_secrets: bool = False) -> VaultItemResponse:
    """Convert a raw DB row to a ``VaultItemResponse``.

    Args:
        row: Raw database row dict.
        include_secrets: When ``True``, decrypt and populate password/content/card fields.

    Returns:
        ``VaultItemResponse`` (secrets omitted unless ``include_secrets=True``).
    """
    decrypted_password: str | None = None
    decrypted_content:  str | None = None
    card_number: str | None = None
    expiry:      str | None = None
    cvv:         str | None = None

    category = row.get("item_type", "password")

    if include_secrets:
        if row.get("password_encrypted"):
            try:
                decrypted_password = _enc.decrypt(row["password_encrypted"])
            except Exception:
                decrypted_password = None

        if row.get("notes_encrypted"):
            try:
                raw = _enc.decrypt(row["notes_encrypted"])
                if category == "card":
                    # Try to unpack card JSON bundle
                    try:
                        bundle = json.loads(raw)
                        decrypted_content = bundle.get("content") or None
                        card_number = bundle.get("card_number") or None
                        expiry      = bundle.get("expiry")      or None
                        cvv         = bundle.get("cvv")         or None
                    except (json.JSONDecodeError, AttributeError):
                        decrypted_content = raw
                else:
                    decrypted_content = raw
            except Exception:
                decrypted_content = None

    return VaultItemResponse(
        id=row["id"],
        user_id=row["user_id"],
        title=row["name"],
        category=category,
        username=row.get("username"),
        password=decrypted_password,
        url=row.get("url"),
        content=decrypted_content,
        card_number=card_number,
        expiry=expiry,
        cvv=cvv,
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
    )


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
        List of ``VaultItemResponse`` with ``password`` and ``content`` as ``None``.
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

    The ``password`` and ``content`` fields are encrypted using AES-256-GCM
    before being written to the database. Card fields are packed into the
    encrypted notes bundle.

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
        ``VaultItemResponse`` with ``password`` and ``content`` decrypted.

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
