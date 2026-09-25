import "server-only";

// ============================================================
//  Límite de intentos en memoria (el sistema corre en un solo servidor local).
//  Frena ataques de fuerza bruta al login y a los códigos de recuperación.
//  Si algún día se usan varios servidores, cambiar el Map por Redis o la BD.
// ============================================================

type Registro = { intentos: number; desde: number; bloqueadoHasta: number };

const g = globalThis as unknown as { __limites?: Map<string, Registro> };
const registros = (g.__limites ??= new Map<string, Registro>());

type Regla = { max: number; ventanaMs: number; bloqueoMs: number };

export const REGLAS = {
  /** Contraseñas fallidas por usuario: 5 en 15 min → 15 min de bloqueo */
  loginUsuario: { max: 5, ventanaMs: 15 * 60_000, bloqueoMs: 15 * 60_000 },
  /** Contraseñas fallidas por IP (varias cuentas): 20 en 15 min → 30 min */
  loginIp: { max: 20, ventanaMs: 15 * 60_000, bloqueoMs: 30 * 60_000 },
  /** Solicitudes de código de recuperación por usuario: 3 por hora */
  otpUsuario: { max: 3, ventanaMs: 60 * 60_000, bloqueoMs: 60 * 60_000 },
  /** Cualquier acción de recuperación por IP: 15 en 15 min */
  recuperacionIp: { max: 15, ventanaMs: 15 * 60_000, bloqueoMs: 30 * 60_000 },
} satisfies Record<string, Regla>;

function limpiar(ahora: number) {
  if (registros.size < 5000) return;
  for (const [k, r] of registros) if (r.bloqueadoHasta < ahora && ahora - r.desde > 3_600_000) registros.delete(k);
}

/** Minutos que faltan si la clave está bloqueada; 0 si puede continuar. */
export function minutosBloqueo(clave: string) {
  const r = registros.get(clave);
  const ahora = Date.now();
  return r && r.bloqueadoHasta > ahora ? Math.ceil((r.bloqueadoHasta - ahora) / 60_000) : 0;
}

/** Suma un intento. Devuelve true si con este intento quedó bloqueado. */
export function registrarIntento(clave: string, regla: Regla) {
  const ahora = Date.now();
  limpiar(ahora);
  let r = registros.get(clave);
  if (!r || ahora - r.desde > regla.ventanaMs) r = { intentos: 0, desde: ahora, bloqueadoHasta: 0 };
  r.intentos++;
  if (r.intentos >= regla.max) {
    r.bloqueadoHasta = ahora + regla.bloqueoMs;
    r.intentos = 0;
    r.desde = ahora;
  }
  registros.set(clave, r);
  return r.bloqueadoHasta > ahora;
}

export function limpiarIntentos(clave: string) {
  registros.delete(clave);
}

/** IP del cliente a partir de las cabeceras (detrás de proxy usa x-forwarded-for). */
export function ipDe(headers: Headers | Record<string, string | string[] | undefined> | undefined) {
  const get = (k: string) => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(k) ?? undefined;
    const v = headers[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return get("x-forwarded-for")?.split(",")[0]?.trim() || get("x-real-ip") || "local";
}
