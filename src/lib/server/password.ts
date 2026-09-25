import "server-only";
import bcrypt from "bcryptjs";
import { ErrorNegocio } from "./errors";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

const LEGACY_PREFIX = "sha256:";

/** Hash de una clave aleatoria: se compara cuando el usuario no existe, para que el login tarde lo mismo. */
export const HASH_FALSO = bcrypt.hashSync(randomBytes(16).toString("hex"), 10);

/** Mínimo 8 caracteres, con al menos una letra y un número. */
export function validarPassword(p: string) {
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    throw new ErrorNegocio("La contraseña debe tener al menos 8 caracteres, con letras y números.");
  }
  if (p.length > 200) throw new ErrorNegocio("La contraseña es demasiado larga.");
}

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

/** 10 caracteres con letras y al menos 2 números (cumple la política de contraseñas). */
export function passwordTemporal() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const numeros = "23456789";
  const chars = [
    ...Array.from({ length: 8 }, () => letras[randomInt(letras.length)]),
    ...Array.from({ length: 2 }, () => numeros[randomInt(numeros.length)]),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function codigoOtp() {
  return String(randomInt(100000, 1000000));
}
