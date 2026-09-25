"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";
import { exigirCursoEnAlcance } from "@/server/academico";
import { hoyISO } from "@/server/turnos";

const cambiosSchema = z.array(
  z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    fielIds: z.array(z.string()),
  }),
);

/**
 * Guarda la tabla de asistencia: por cada fecha modificada deja exactamente los
 * alumnos marcados. Una fecha sin ningún alumno marcado no cuenta como clase dictada.
 */
export async function guardarAsistenciaTabla(cursoId: string, nivel: number, cambios: { fecha: string; fielIds: string[] }[]) {
  return runAction(async () => {
    const user = await requireUser(R.REGISTRA_CLASES);
    await exigirCursoEnAlcance(user, cursoId);
    if (!Number.isInteger(nivel) || nivel < 1) throw new ErrorNegocio("Nivel inválido.");
    const lista = cambiosSchema.parse(cambios);
    const hoy = hoyISO();
    if (lista.some((c) => c.fecha > hoy)) throw new ErrorNegocio("No puedes registrar asistencia de fechas futuras.");

    const matriculados = new Set(
      (await prisma.matricula.findMany({ where: { cursoId }, select: { fielId: true } })).map((m) => m.fielId),
    );

    await prisma.$transaction(async (tx) => {
      for (const c of lista) {
        const fecha = new Date(`${c.fecha}T00:00:00.000Z`);
        const fielIds = c.fielIds.filter((id) => matriculados.has(id));
        const clave = { cursoId_nivel_fecha: { cursoId, nivel, fecha } };
        if (fielIds.length === 0) {
          await tx.sesionClase.deleteMany({ where: { cursoId, nivel, fecha } });
          continue;
        }
        const sesion = await tx.sesionClase.upsert({
          where: clave,
          create: { cursoId, nivel, fecha, creadaPorId: user.fielId },
          update: {},
        });
        await tx.asistenciaCurso.deleteMany({ where: { sesionId: sesion.id } });
        await tx.asistenciaCurso.createMany({ data: fielIds.map((fielId) => ({ sesionId: sesion.id, fielId })) });
      }
    });
    revalidatePath("/workspace/asistencia-cursos");
    return lista.length;
  });
}
