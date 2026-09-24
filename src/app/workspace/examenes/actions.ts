"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { formObj, zEntero, zNumero, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { exigirCursoEnAlcance } from "@/server/academico";
import { nuevoCodigo } from "@/server/codigos";

const schema = z.object({
  cursoId: zTexto("Selecciona el curso"),
  nivel: zEntero("Nivel inválido").min(1),
  actividadId: zTextoOpc,
  pregunta: zTexto("Escribe la pregunta"),
  respuestaCorrecta: zTexto("Escribe la respuesta correcta"),
  puntos: zNumero("Puntos inválidos").positive().default(1),
});

export async function guardarPregunta(id: string | null, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.DOCENTE);
    const d = schema.parse(formObj(fd));
    await exigirCursoEnAlcance(user, d.cursoId);
    if (id) {
      const actual = await prisma.pregunta.findUniqueOrThrow({ where: { id } });
      await exigirCursoEnAlcance(user, actual.cursoId);
      await prisma.pregunta.update({ where: { id }, data: d });
    } else {
      await prisma.pregunta.create({ data: { ...d, codigo: nuevoCodigo("PQ") } });
    }
    revalidatePath("/workspace/examenes");
    return null;
  });
}

export async function eliminarPregunta(id: string) {
  return runAction(async () => {
    const user = await requireUser(R.DOCENTE);
    const p = await prisma.pregunta.findUniqueOrThrow({ where: { id } });
    await exigirCursoEnAlcance(user, p.cursoId);
    await prisma.pregunta.delete({ where: { id } });
    revalidatePath("/workspace/examenes");
    return null;
  });
}
