"use server";

import { RolMaestro } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zEnteroOpc, zTexto } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";

const maestroSchema = z.object({
  fielId: zTexto("Selecciona el maestro"),
  cursoId: zTexto("Selecciona el curso"),
  nivel: zEnteroOpc,
  rol: z.enum(RolMaestro),
});

export async function asignarMaestro(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const d = maestroSchema.parse(formObj(fd));
    const existe = await prisma.asignacionMaestro.findFirst({
      where: { fielId: d.fielId, cursoId: d.cursoId, nivel: d.nivel ?? null },
    });
    if (existe) throw new ErrorNegocio("Ese maestro ya está asignado a ese curso y nivel.");
    await prisma.asignacionMaestro.create({ data: { ...d, nivel: d.nivel ?? null } });
    // Matrículas sin maestro toman al nuevo titular
    if (d.rol === "TITULAR") {
      await prisma.matricula.updateMany({ where: { cursoId: d.cursoId, maestroId: null }, data: { maestroId: d.fielId } });
    }
    revalidatePath("/workspace/asignaciones");
    return null;
  });
}

const supervisorSchema = z.object({
  fielId: zTexto("Selecciona el supervisor"),
  cursoId: zTexto("Selecciona el curso"),
  nivelAutorizado: z.string().trim().min(1).default("Todos"),
});

export async function asignarSupervisor(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const d = supervisorSchema.parse(formObj(fd));
    await prisma.asignacionSupervisor.upsert({
      where: { fielId_cursoId: { fielId: d.fielId, cursoId: d.cursoId } },
      create: d,
      update: { nivelAutorizado: d.nivelAutorizado, estado: "ACTIVO" },
    });
    await prisma.matricula.updateMany({ where: { cursoId: d.cursoId, supervisorId: null }, data: { supervisorId: d.fielId } });
    revalidatePath("/workspace/asignaciones");
    return null;
  });
}

export async function quitarMaestro(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.asignacionMaestro.delete({ where: { id } });
    revalidatePath("/workspace/asignaciones");
    return null;
  });
}

export async function quitarSupervisor(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.asignacionSupervisor.delete({ where: { id } });
    revalidatePath("/workspace/asignaciones");
    return null;
  });
}
