"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";
import { exigirCursoEnAlcance } from "@/server/academico";

type Datos = { cursoId: string; nivel: number; fecha: string; tema: string; fielIds: string[] };

/** Crea (o actualiza) la clase del día y reemplaza su lista de asistentes. */
export async function guardarSesion(d: Datos) {
  return runAction(async () => {
    const user = await requireUser(R.REGISTRA_CLASES);
    if (!d.cursoId) throw new ErrorNegocio("Selecciona el curso.");
    if (!d.fecha) throw new ErrorNegocio("Selecciona la fecha.");
    if (!Number.isInteger(d.nivel) || d.nivel < 1) throw new ErrorNegocio("Nivel inválido.");
    await exigirCursoEnAlcance(user, d.cursoId);

    // Solo estudiantes matriculados en el curso
    const validos = await prisma.matricula.findMany({
      where: { cursoId: d.cursoId, fielId: { in: d.fielIds } },
      select: { fielId: true },
    });
    const fecha = new Date(`${d.fecha}T00:00:00.000Z`);

    const total = await prisma.$transaction(async (tx) => {
      const sesion = await tx.sesionClase.upsert({
        where: { cursoId_nivel_fecha: { cursoId: d.cursoId, nivel: d.nivel, fecha } },
        create: { cursoId: d.cursoId, nivel: d.nivel, fecha, tema: d.tema || null, creadaPorId: user.fielId },
        update: { tema: d.tema || null },
      });
      await tx.asistenciaCurso.deleteMany({ where: { sesionId: sesion.id } });
      const { count } = await tx.asistenciaCurso.createMany({
        data: validos.map((v) => ({ sesionId: sesion.id, fielId: v.fielId })),
      });
      return count;
    });
    revalidatePath("/workspace/asistencia-cursos");
    return total;
  });
}

export async function eliminarSesion(id: string) {
  return runAction(async () => {
    const user = await requireUser(R.REGISTRA_CLASES);
    const s = await prisma.sesionClase.findUniqueOrThrow({ where: { id } });
    await exigirCursoEnAlcance(user, s.cursoId);
    await prisma.sesionClase.delete({ where: { id } });
    revalidatePath("/workspace/asistencia-cursos");
    return null;
  });
}
