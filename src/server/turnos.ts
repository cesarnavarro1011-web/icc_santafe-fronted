import "server-only";
import { prisma } from "@/lib/prisma";
import { ErrorNegocio } from "@/lib/server/errors";
import type { UsuarioSesion } from "@/lib/server/session";

// ============================================================
//  Cronograma de asistencia: cada semana (lunes a domingo) uno o
//  varios grupos tienen turno. Su líder es quien
//  registran la asistencia de los servicios de esa semana.
// ============================================================

const DIA = 86_400_000;

/** "yyyy-mm-dd" de hoy en la hora local del servidor. */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Lunes (00:00 UTC, como las columnas @db.Date) de la semana de la fecha dada. */
export function lunesDe(fecha: string | Date) {
  const iso = typeof fecha === "string" ? fecha.slice(0, 10) : fecha.toISOString().slice(0, 10);
  const d = new Date(`${iso}T00:00:00.000Z`);
  const dia = d.getUTCDay(); // 0 domingo … 6 sábado
  return new Date(d.getTime() - ((dia + 6) % 7) * DIA);
}

export function domingoDe(lunes: Date) {
  return new Date(lunes.getTime() + 6 * DIA);
}

export function sumarSemanas(lunes: Date, n: number) {
  return new Date(lunes.getTime() + n * 7 * DIA);
}

export function turnosDeSemana(lunes: Date) {
  return prisma.turnoAsistencia.findMany({
    where: { semana: lunes },
    include: { grupo: { include: { lider: { select: { nombre: true, apellido: true } } } } },
    orderBy: { grupo: { nombre: "asc" } },
  });
}

/** Grupos que lidera la persona (en los que registra asistencia). */
async function gruposDelUsuario(user: UsuarioSesion) {
  if (user.rol === "LIDER") {
    const g = await prisma.grupo.findMany({ where: { liderId: user.fielId, estado: "ACTIVO" }, select: { id: true } });
    return g.map((x) => x.id);
  }
  return [];
}

export type PermisoRegistro =
  | { puede: true; libre: boolean; desde?: string; hasta?: string; grupos: string[] }
  | { puede: false; motivo: string };

/**
 * ¿Puede registrar asistencia de la iglesia en la semana de `fecha`?
 * Superadmin siempre; el líder solo si su grupo tiene turno esa semana.
 */
export async function permisoRegistro(user: UsuarioSesion, fecha: string = hoyISO()): Promise<PermisoRegistro> {
  if (user.rol === "SUPERADMIN") return { puede: true, libre: true, grupos: [] };
  if (user.rol !== "LIDER") {
    return { puede: false, motivo: "Tu rol puede consultar la asistencia, pero no registrarla." };
  }
  const grupos = await gruposDelUsuario(user);
  if (grupos.length === 0) {
    return { puede: false, motivo: "Aún no tienes un grupo asignado. Pídele al pastor que te asigne uno." };
  }
  const lunes = lunesDe(fecha);
  const turnos = await prisma.turnoAsistencia.findMany({
    where: { semana: lunes, grupoId: { in: grupos } },
    include: { grupo: { select: { nombre: true } } },
  });
  if (turnos.length === 0) {
    return { puede: false, motivo: "Tu grupo no tiene turno de asistencia en la semana de esa fecha. Revisa el cronograma." };
  }
  return {
    puede: true,
    libre: false,
    desde: lunes.toISOString().slice(0, 10),
    hasta: domingoDe(lunes).toISOString().slice(0, 10),
    grupos: turnos.map((t) => t.grupo.nombre),
  };
}

export async function exigirTurno(user: UsuarioSesion, fecha: string) {
  const p = await permisoRegistro(user, fecha);
  if (!p.puede) throw new ErrorNegocio(p.motivo);
  return p;
}
