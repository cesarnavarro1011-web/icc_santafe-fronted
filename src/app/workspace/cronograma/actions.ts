"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zEntero, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { lunesDe, sumarSemanas } from "@/server/turnos";

function revalidar() {
  revalidatePath("/workspace/cronograma");
  revalidatePath("/workspace/asistencia");
  revalidatePath("/workspace/grupos");
  revalidatePath("/workspace/mi-grupo");
}

const turnoSchema = z.object({
  semana: zTexto("Elige la semana"),
  grupoId: zTexto("Elige el grupo"),
  notas: zTextoOpc,
});

export async function asignarTurno(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.ADMIN);
    const d = turnoSchema.parse(formObj(fd));
    const semana = lunesDe(d.semana);
    await prisma.turnoAsistencia.upsert({
      where: { grupoId_semana: { grupoId: d.grupoId, semana } },
      create: { grupoId: d.grupoId, semana, notas: d.notas, creadoPorId: user.fielId },
      update: { notas: d.notas },
    });
    revalidar();
    return null;
  });
}

export async function quitarTurno(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.turnoAsistencia.delete({ where: { id } });
    revalidar();
    return null;
  });
}

const rotacionSchema = z.object({
  desde: zTexto("Elige desde qué semana"),
  semanas: zEntero("Número de semanas inválido").min(1).max(52),
});

/**
 * Reparte las semanas entre los grupos activos en orden (A, B, C, A, B, C…),
 * continuando después del último grupo que tuvo turno. No toca semanas que ya
 * tienen un turno asignado.
 */
export async function generarRotacion(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.ADMIN);
    const d = rotacionSchema.parse(formObj(fd));
    const grupos = await prisma.grupo.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" } });
    if (grupos.length === 0) throw new ErrorNegocio("No hay grupos activos. Créalos en Grupos y líderes.");

    const inicio = lunesDe(d.desde);
    const ultimo = await prisma.turnoAsistencia.findFirst({ where: { semana: { lt: inicio } }, orderBy: { semana: "desc" } });
    let idx = ultimo ? (grupos.findIndex((g) => g.id === ultimo.grupoId) + 1) % grupos.length : 0;

    let creados = 0;
    for (let i = 0; i < d.semanas; i++) {
      const semana = sumarSemanas(inicio, i);
      const ocupada = await prisma.turnoAsistencia.count({ where: { semana } });
      if (ocupada) continue;
      await prisma.turnoAsistencia.create({ data: { semana, grupoId: grupos[idx].id, creadoPorId: user.fielId } });
      idx = (idx + 1) % grupos.length;
      creados++;
    }
    revalidar();
    return creados;
  });
}
