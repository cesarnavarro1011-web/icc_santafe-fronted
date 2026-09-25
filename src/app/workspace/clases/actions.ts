"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { requireUser } from "@/lib/server/session";
import { exigirCursoEnAlcance, recalcularMatricula } from "@/server/academico";
import { iniciarCertificado } from "@/server/certificados";

/** Antes aprobarCursoMaestro + iniciarCertificado: el maestro aprueba y firma primero. */
export async function aprobarYCertificar(matriculaId: string) {
  return runAction(async () => {
    const user = await requireUser(R.CALIFICA);
    await iniciarCertificado(user, matriculaId);
    revalidatePath("/workspace/clases");
    revalidatePath("/workspace/certificados");
    return null;
  });
}

export async function recalcular(matriculaId: string) {
  return runAction(async () => {
    const user = await requireUser(R.ACADEMICO);
    const m = await prisma.matricula.findUniqueOrThrow({ where: { id: matriculaId } });
    await exigirCursoEnAlcance(user, m.cursoId);
    await recalcularMatricula(m.id);
    revalidatePath(`/workspace/clases/${m.cursoId}`);
    return null;
  });
}
