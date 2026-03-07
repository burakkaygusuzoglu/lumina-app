"""
Lumina Life OS — Vault Models
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

The Vault is an AES-256 encrypted store for passwords, API keys,
private notes, and sensitive documents. Sensitive fields are NEVER
returned in plaintext over the wire — the API returns decrypted values
only when the vault item is individually fetched by its owner.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict


class VaultItemCreate(BaseModel):
    """Payload for storing an item in the Vault.

    Attributes:
        title: Human-readable label for the item.
        category: Category of the secret (password/note/card/document).
        username: Login username (for ``password`` type).
        password: Secret value to encrypt.
        url: Associated website URL.
        content: Secure note / document content (encrypted at rest).
        card_number: Card number (card category; packed into encrypted notes).
        expiry: Card expiry MM/YY (packed into encrypted notes).
        cvv: Card CVV (packed into encrypted notes).
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(..., min_length=1, max_length=255, description="Display name")
    category: str = Field(default="password", description="password/note/card/document")
    username: str | None = Field(None, max_length=255)
    password: str | None = Field(None, description="Secret to encrypt")
    url: str | None = Field(None, max_length=2048)
    content: str | None = Field(None, max_length=5000, description="Note/document content (encrypted)")
    card_number: str | None = Field(None, description="Card number (card category)")
    expiry: str | None = Field(None, description="Card expiry MM/YY")
    cvv: str | None = Field(None, description="Card CVV")


class VaultItemUpdate(BaseModel):
    """Partial update payload for a vault item."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(None, max_length=255)
    username: str | None = None
    password: str | None = None
    url: str | None = None
    content: str | None = None
    card_number: str | None = None
    expiry: str | None = None
    cvv: str | None = None


class VaultItemResponse(BaseModel):
    """Vault item returned from the API.

    Sensitive fields (``password``, ``content``, card fields) are only
    populated when the item is fetched individually via ``GET /vault/{id}``.
    In list views they are omitted to minimise exposure.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    category: str
    username: str | None = None
    password: str | None = Field(None, description="Populated on individual fetch only")
    url: str | None = None
    content: str | None = Field(None, description="Populated on individual fetch only")
    card_number: str | None = None
    expiry: str | None = None
    cvv: str | None = None
    created_at: str
    updated_at: str
