"""
Lumina Life OS — Encryption Service (AES-256-GCM)
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Provides authenticated symmetric encryption for the Vault module.
Uses AES-256-GCM via the ``cryptography`` library:
  - 256-bit key derived from the master secret using PBKDF2-HMAC-SHA256
  - 96-bit random IV per operation
  - GCM authentication tag (128-bit) prevents silent data corruption
  - Ciphertext is returned as a URL-safe base64 string for database storage

Security properties:
  ✓ Confidentiality — AES-256 is computationally infeasible to brute-force
  ✓ Integrity     — GCM tag detects any tampering
  ✓ IV uniqueness — Random IV generated per encryption; never reused
  ✗ Forward secrecy — Not provided; rotate ``VAULT_ENCRYPTION_KEY`` to re-encrypt
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)

_IV_LENGTH = 12       # 96-bit GCM nonce (NIST recommended)
_KEY_LENGTH = 32      # 256-bit AES key
_SALT_LENGTH = 16     # Salt for key derivation
_PBKDF2_ITERATIONS = 100_000


def _derive_key(master_secret: str, salt: bytes) -> bytes:
    """Derive a 256-bit AES key from the master secret using PBKDF2-HMAC-SHA256.

    Args:
        master_secret: The raw ``VAULT_ENCRYPTION_KEY`` setting value.
        salt: 16-byte random salt.

    Returns:
        32-byte derived key.
    """
    return hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=master_secret.encode("utf-8"),
        salt=salt,
        iterations=_PBKDF2_ITERATIONS,
        dklen=_KEY_LENGTH,
    )


class EncryptionService:
    """AES-256-GCM symmetric encryption service for the Vault module.

    The on-disk format is:
        base64url( salt[16] || iv[12] || ciphertext+tag )

    This format is self-contained — the salt and IV are stored alongside
    the ciphertext without a separate column.
    """

    def __init__(self) -> None:
        """Initialise using the configured vault encryption key."""
        self._master_secret: str = settings.vault_encryption_key

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a UTF-8 string using AES-256-GCM.

        Args:
            plaintext: The secret string to encrypt (e.g. a password).

        Returns:
            URL-safe base64 string containing salt + IV + ciphertext + tag.

        Raises:
            HTTPException: 500 if encryption fails unexpectedly.
        """
        try:
            salt = os.urandom(_SALT_LENGTH)
            iv = os.urandom(_IV_LENGTH)
            key = _derive_key(self._master_secret, salt)
            aesgcm = AESGCM(key)
            ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
            blob = salt + iv + ciphertext
            return base64.urlsafe_b64encode(blob).decode("ascii")
        except Exception as exc:
            logger.error("Vault encryption failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Encryption error",
            ) from exc

    def decrypt(self, encrypted: str) -> str:
        """Decrypt an AES-256-GCM encrypted string.

        Args:
            encrypted: URL-safe base64 blob produced by ``encrypt``.

        Returns:
            The original plaintext string.

        Raises:
            HTTPException: 400 if the data is corrupt or tampered with.
            HTTPException: 500 on unexpected decryption failure.
        """
        try:
            blob = base64.urlsafe_b64decode(encrypted.encode("ascii"))
            salt = blob[:_SALT_LENGTH]
            iv = blob[_SALT_LENGTH: _SALT_LENGTH + _IV_LENGTH]
            ciphertext = blob[_SALT_LENGTH + _IV_LENGTH:]
            key = _derive_key(self._master_secret, salt)
            aesgcm = AESGCM(key)
            plaintext_bytes = aesgcm.decrypt(iv, ciphertext, None)
            return plaintext_bytes.decode("utf-8")
        except InvalidTag:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vault data is corrupt or has been tampered with",
            )
        except Exception as exc:
            logger.error("Vault decryption failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Decryption error",
            ) from exc

    def encrypt_dict(self, data: dict) -> dict[str, str]:
        """Encrypt every string value in a flat dictionary.

        Non-string values are JSON-serialised before encryption.

        Args:
            data: Dictionary of field → value pairs.

        Returns:
            Dictionary with every value replaced by its encrypted form.
        """
        import json
        return {
            k: self.encrypt(v if isinstance(v, str) else json.dumps(v))
            for k, v in data.items()
            if v is not None
        }

    def decrypt_dict(self, data: dict[str, str]) -> dict:
        """Decrypt every value in a flat dictionary of encrypted strings.

        Args:
            data: Dictionary of field → encrypted value pairs.

        Returns:
            Dictionary with decrypted values. JSON strings are parsed back.
        """
        import json
        result = {}
        for k, v in data.items():
            if v is None:
                result[k] = None
                continue
            raw = self.decrypt(v)
            try:
                result[k] = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                result[k] = raw
        return result
