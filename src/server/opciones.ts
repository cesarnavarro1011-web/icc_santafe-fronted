import "server-only";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Opcion = { value: string; label: string };

/** `conCodigo: false` muestra solo "Apellido Nombre", sin el ID de fiel. */
export async function opcionesFieles(opts: { roles?: Rol[]; soloActivos?: boolean; conCodigo?: boolean } = {}): Promise<Opcion[]> {
  const fieles = await prisma.fiel.findMany({
    where: {
      ...(opts.soloActivos !== false ? { estado: "ACTIVO" } : {}),
      ...(opts.roles ? { usuario: { rol: { in: opts.roles } } } : {}),
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    select: { id: true, codigo: true, nombre: true, apellido: true },
  });
  return fieles.map((f) => ({
    value: f.id,
    label: opts.conCodigo === false ? `${f.apellido} ${f.nombre}` : `${f.apellido} ${f.nombre} · ${f.codigo}`,
  }));
}

export async function opcionesCursos(alcance: string[] | null = null, soloActivos = true): Promise<Opcion[]> {
  const cursos = await prisma.curso.findMany({
    where: {
      ...(soloActivos ? { estado: "ACTIVO" } : {}),
      ...(alcance !== null ? { id: { in: alcance } } : {}),
    },
    orderBy: { nombre: "asc" },
    select: { id: true, codigo: true, nombre: true },
  });
  return cursos.map((c) => ({ value: c.id, label: `${c.nombre} (${c.codigo})` }));
}
