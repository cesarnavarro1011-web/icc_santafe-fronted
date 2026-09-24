import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomInt, timingSafeEqual } from "crypto";

const LEGACY_PREFIX = "sha256:";

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

/** Hash SHA-256 hex, igual que hashPassword() del Apps Script. */
export function sha256Hex(plain: string) {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function legacyHash(sha256: string) {
  return LEGACY_PREFIX + sha256.toLowerCase();
}

/**
 * Verifica la contraseña. Devuelve `needsRehash` cuando el hash guardado es del
 * sistema anterior (SHA-256 sin sal) para migrarlo a bcrypt tras el login.
 */
export async function verifyPassword(plain: string, stored: string) {
  if (stored.startsWith(LEGACY_PREFIX)) {
    const a = Buffer.from(sha256Hex(plain));
    const b = Buffer.from(stored.slice(LEGACY_PREFIX.length));
    const ok = a.length === b.length && timingSafeEqual(a, b);
    return { ok, needsRehash: ok };
  }
  return { ok: await bcrypt.compare(plain, stored), needsRehash: false };
}

export function passwordTemporal() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join("");
}

export function codigoOtp() {
  return String(randomInt(100000, 1000000));
}
