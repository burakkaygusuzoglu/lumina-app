/**
 * Lumina E2E Zero-Knowledge Encryption
 * Uses Web Crypto API (AES-GCM 256-bit + PBKDF2)
 * Ensures the server never sees the raw passwords or notes.
 */

const SALT_KEY = 'lumina-e2e-salt';

// Generate a random salt for the user or get from local
function getSalt(): Uint8Array<ArrayBuffer> {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    const randomSalt = crypto.getRandomValues(new Uint8Array(16));
    salt = btoa(String.fromCharCode(...Array.from(randomSalt)));
    localStorage.setItem(SALT_KEY, salt);
  }
  const binaryString = atob(salt);
  const bytes = new Uint8Array(new ArrayBuffer(binaryString.length)); // Ensure pure ArrayBuffer
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Derive a 256-bit AES key from the master password using PBKDF2
export async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(getSalt().buffer), // Strict typings buffer cast for Vercel/TS
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext into a base64 encoded string containing IV + Ciphertext
export async function encryptE2E(plaintext: string, key: CryptoKey): Promise<string> {
  if (!plaintext) return '';
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt base64 string back to plaintext
export async function decryptE2E(encryptedBase64: string, key: CryptoKey): Promise<string> {
  if (!encryptedBase64) return '';
  try {
    const binaryStr = atob(encryptedBase64);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed (Invalid master password or corrupted)');
    return '*** 🔒 DECRYPTION_FAILED ***';
  }
}
