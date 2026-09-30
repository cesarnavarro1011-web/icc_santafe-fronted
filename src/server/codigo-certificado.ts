import "server-only";
import { createHmac } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ============================================================
//  Código de registro de certificados: PREFIJO-AÑO-CONSECUTIVO-VERIFICADOR
//  Ej: ICCSF-2026-0001-K7
//  · El consecutivo se reinicia cada año y se asigna al emitir (firma del pastor).
//  · Los 2 caracteres finales salen de una firma HMAC: detectan códigos mal
//    escritos o inventados sin consultar la base de datos.
// ============================================================

export const PREFIJO_DEFECTO = "ICCSF";
// Sin letras/números que se confunden (0/O, 1/I/L)
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const FORMATO = /^([A-Z0-9]{2,10})-(\d{4})-(\d{4,})-([A-Z0-9]{2})$/;

export function normalizarPrefijo(p: string | null | undefined) {
  const limpio = (p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return limpio.length >= 2 ? limpio : PREFIJO_DEFECTO;
}

/** Normaliza lo que escribe una persona: mayúsculas, sin espacios. */
export function normalizarCodigoRegistro(codigo: string) {
  return codigo.trim().toUpperCase().replace(/\s+/g, "");
}

// Conviene fijar CERTIFICADOS_SECRET en producción: si cambia, los códigos ya emitidos siguen
// verificándose (se buscan en la base), pero su verificador dejaría de coincidir.
function secreto() {
  return process.env.CERTIFICADOS_SECRET || process.env.NEXTAUTH_SECRET || "icc-santafe-certificados";
}

function verificador(base: string) {
  const h = createHmac("sha256", secreto()).update(base).digest();
  return ALFABETO[h[0] % ALFABETO.length] + ALFABETO[h[1] % ALFABETO.length];
}

export function armarCodigo(prefijo: string, anio: number, consecutivo: number) {
  const base = `${prefijo}-${anio}-${String(consecutivo).padStart(4, "0")}`;
  return `${base}-${verificador(base)}`;
}

/** "valido" | "mal-escrito" (formato nuevo con verificador incorrecto) | "otro" (formato anterior u otro). */
export function revisarFormato(codigo: string): "valido" | "mal-escrito" | "otro" {
  const m = FORMATO.exec(codigo);
  if (!m) return "otro";
  return verificador(`${m[1]}-${m[2]}-${m[3]}`) === m[4] ? "valido" : "mal-escrito";
}

function anioColombia(d = new Date()) {
  return Number(d.toLocaleDateString("en-CA", { timeZone: "America/Bogota", year: "numeric" }));
}

/** Siguiente consecutivo del año para ese prefijo. */
async function siguienteConsecutivo(prefijo: string, anio: number) {
  const existentes = await prisma.certificado.findMany({
    where: { codigo: { startsWith: `${prefijo}-${anio}-` } },
    select: { codigo: true },
  });
  const max = existentes.reduce((m, c) => {
    const n = Number(FORMATO.exec(c.codigo)?.[3] ?? 0);
    return n > m ? n : m;
  }, 0);
  return max + 1;
}

/**
 * Asigna el código de registro definitivo al emitir. Si el certificado ya tiene uno
 * con el formato nuevo (p. ej. se regenera), lo conserva.
 */
export async function asignarCodigoRegistro(certificadoId: string, prefijoPlantilla: string | null | undefined) {
  const c = await prisma.certificado.findUniqueOrThrow({ where: { id: certificadoId }, select: { codigo: true } });
  if (revisarFormato(c.codigo) === "valido") return c.codigo;

  const prefijo = normalizarPrefijo(prefijoPlantilla);
  const anio = anioColombia();
  // Dos emisiones al mismo tiempo podrían tomar el mismo número: el índice único lo impide y se reintenta
  for (let intento = 0; intento < 5; intento++) {
    const codigo = armarCodigo(prefijo, anio, (await siguienteConsecutivo(prefijo, anio)) + intento);
    try {
      await prisma.certificado.update({ where: { id: certificadoId }, data: { codigo } });
      return codigo;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  throw new Error("No se pudo asignar el código de registro del certificado.");
}

/** Ejemplo para la vista previa de la plantilla. */
export function codigoEjemplo(prefijo: string | null | undefined) {
  return armarCodigo(normalizarPrefijo(prefijo), anioColombia(), 1);
}
