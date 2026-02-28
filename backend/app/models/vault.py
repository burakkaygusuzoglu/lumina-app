"""
Lumina Life OS — Vault Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

The Vault is an AES-256 encrypted store for passwords, API keys,
private notes, and sensitive documents. Sensitive fields are NEVER
returned in plaintext over the wire — the API returns decrypted values
only when the vault item is individually fetched by its owner.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class VaultItemType(str, Enum):
    """Category of vault item.

    - ``password``  → Website/app credentials
    - ``api_key``   → Developer API keys / tokens
    - ``note``      → Private encrypted text
    - ``document``  → Sensitive document content
    - ``card``      → Payment card details
    """

    PASSWORD = "password"
    API_KEY = "api_key"
    NOTE = "note"
    DOCUMENT = "document"
    CARD = "card"


class VaultItemCreate(BaseModel):
    """Payload for storing an item in the Vault.

    Attributes:
        name: Human-readable label for the item.
        item_type: Category of the secret.
        username: Login username (for ``password`` type).
        password: Secret value to encrypt.
        url: Associated website URL.
        notes: Additional plaintext notes (will also be encrypted).
        metadata: Arbitrary extra data stored encrypted.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., min_length=1, max_length=255, description="Display name")
    item_type: VaultItemType = Field(default=VaultItemType.PASSWORD)
    username: str | None = Field(None, max_length=255)
    password: str | None = Field(None, description="Secret to encrypt")
    url: str | None = Field(None, max_length=2048)
    notes: str | None = Field(None, max_length=5000, description="Private notes (encrypted)")
    metadata: dict = Field(default_factory=dict, description="Extra encrypted data")


class VaultItemUpdate(BaseModel):
    """Partial update payload for a vault item."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(None, max_length=255)
    username: str | None = None
    password: str | None = None
    url: str | None = None
    notes: str | None = None
    metadata: dict | None = None


class VaultItemResponse(BaseModel):
    """Vault item returned from the API.

    Sensitive fields (``password``, ``notes``) are only populated when the
    item is fetched individually via ``GET /vault/{id}``.  In list views,
    they are omitted to minimise exposure.

    Attributes:
        id: UUID primary key.
        user_id: Owner's UUID.
        name: Display label.
        item_type: Category.
        username: Login username if applicable.
        password: Decrypted secret (individual fetch only).
        url: Associated URL.
        notes: Decrypted private notes (individual fetch only).
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    item_type: VaultItemType
    username: str | None = None
    password: str | None = Field(None, description="Populated on individual fetch only")
    url: str | None = None
    notes: str | None = Field(None, description="Populated on individual fetch only")
    created_at: datetime
    updated_at: datetime
