"use server";

import { EstadoRegistro } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";

const grupoSchema = z.object({
  nombre: zTexto("El nombre del grupo es obligatorio"),
  descripcion: zTextoOpc,
  liderId: zTextoOpc,
  estado: z.enum(EstadoRegistro).default("ACTIVO"),
});

function revalidar() {
  revalidatePath("/workspace/grupos");
  revalidatePath("/workspace/cronograma");
  revalidatePath("/workspace/mi-grupo");
}

export async function guardarGrupo(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const d = grupoSchema.parse(formObj(fd));
    if (d.liderId) {
      const u = await prisma.usuario.findUnique({ where: { fielId: d.liderId } });
      if (u?.rol !== "LIDER") throw new ErrorNegocio("El líder debe tener acceso al sistema con rol Líder.");
    }
    const data = { ...d, liderId: d.liderId ?? null };
    const g = id ? await prisma.grupo.update({ where: { id }, data }) : await prisma.grupo.create({ data });
    // El líder también es miembro de su grupo
    if (g.liderId) await prisma.fiel.update({ where: { id: g.liderId }, data: { grupoId: g.id } });
    revalidar();
    return null;
  });
}

/** Deja exactamente estos fieles en el grupo (un fiel pertenece a un solo grupo). */
export async function asignarMiembros(grupoId: string, fielIds: string[]) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const grupo = await prisma.grupo.findUniqueOrThrow({ where: { id: grupoId } });
    const ids = new Set(fielIds);
    if (grupo.liderId) ids.add(grupo.liderId);
    const actuales = await prisma.fiel.findMany({ where: { grupoId }, select: { id: true } });
    const salen = actuales.map((f) => f.id).filter((id) => !ids.has(id));
    await prisma.$transaction([
      prisma.fiel.updateMany({ where: { id: { in: salen } }, data: { grupoId: null } }),
      prisma.fiel.updateMany({ where: { id: { in: [...ids] } }, data: { grupoId } }),
    ]);
    revalidar();
    return ids.size;
  });
}

export async function eliminarGrupo(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.grupo.delete({ where: { id } }); // los turnos se borran en cascada; los miembros quedan sin grupo
    revalidar();
    return null;
  });
}
