/**
 * crypto.ts — AES-256-GCM encrypt/decrypt for sensitive fields stored in Postgres.
 *
 * Fields encrypted: Product.resendApiKey, Product.webhookSecret, Product.syncApiKey
 *
 * Requires ENCRYPTION_KEY in .env — a 64-char hex string (32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Cipher format (base64-encoded): <12-byte iv>:<16-byte tag>:<ciphertext>
 * All three parts are concatenated then base64url-encoded as a single string.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV — recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set in environment variables. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }
  return buf;
}

/**
 * Encrypt a plaintext string.
 * Returns a base64url-encoded string: "<iv>:<tag>:<ciphertext>"
 * Returns the original value unchanged if it appears already encrypted
 * (i.e. already contains the delimiter pattern — defensive guard).
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  // Guard: already encrypted (contains our delimiter structure)
  if (isEncrypted(plaintext)) return plaintext;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv || tag || ciphertext → base64url
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64url");
}

/**
 * Decrypt a value encrypted by encrypt().
 * Returns the plaintext, or throws if the ciphertext is invalid / tampered.
 * Returns the original value unchanged if it does not look encrypted
 * (fallback for plaintext values already stored, e.g. during migration).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  if (!isEncrypted(ciphertext)) {
    // Plain-text fallback: value was stored before encryption was enabled.
    // Return as-is — caller should re-encrypt on next write.
    return ciphertext;
  }

  const key = getKey();
  const packed = Buffer.from(ciphertext, "base64url");

  if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted value: too short.");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error(
      "Decryption failed — ciphertext may be tampered or ENCRYPTION_KEY mismatch.",
    );
  }
}

/**
 * Heuristic check: is this value likely already encrypted by this module?
 * Base64url strings of our minimum packed length are at least 41 chars.
 */
function isEncrypted(value: string): boolean {
  if (value.length < 41) return false;
  // base64url chars only: A-Z a-z 0-9 - _
  return /^[A-Za-z0-9\-_]+$/.test(value);
}

/**
 * Encrypt only if the value is not already encrypted.
 * Convenience wrapper for upsert operations.
 */
export function encryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}
