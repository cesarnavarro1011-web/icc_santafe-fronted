"use server";

import { EstadoCivil, EstadoRegistro } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zBool, zCorreoOpc, zFechaOpc, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser, type UsuarioSesion } from "@/lib/server/session";
import { codigoFiel } from "@/server/codigos";

const fielSchema = z.object({
  documento: zTextoOpc,
  nombre: zTexto("El nombre es obligatorio"),
  apellido: zTexto("El apellido es obligatorio"),
  fechaNacimiento: zFechaOpc,
  estadoCivil: z.preprocess((v) => (v === "" ? null : v), z.enum(EstadoCivil).nullable()),
  bautizado: zBool,
  celular: zTextoOpc,
  correo: zCorreoOpc,
  direccion: zTextoOpc,
  estado: z.enum(EstadoRegistro).default("ACTIVO"),
  grupoId: zTextoOpc, // líder asignado = grupo de ese líder
  otroCargo: zTextoOpc,
});

/** El líder solo puede dejar fieles en sus propios grupos (o sin cambiarlos). */
async function validarGrupo(user: UsuarioSesion, grupoId: string | null, actual: string | null) {
  if (grupoId === actual || user.rol !== "LIDER" || !grupoId) return;
  const propio = await prisma.grupo.count({ where: { id: grupoId, liderId: user.fielId } });
  if (!propio) throw new ErrorNegocio("Solo puedes asignar fieles a tu propio grupo. Para otro líder, pídeselo al pastor.");
}

export async function guardarFiel(id: string | null, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.PASTORAL);
    const { documento, otroCargo, grupoId: g, ...data } = fielSchema.parse(formObj(fd));
    const grupoId = g ?? null;

    const anterior = id ? await prisma.fiel.findUniqueOrThrow({ where: { id } }) : null;
    await validarGrupo(user, grupoId, anterior?.grupoId ?? null);

    const fiel = id
      ? await prisma.fiel.update({ where: { id }, data: { ...data, grupoId } })
      : await prisma.fiel.create({ data: { ...data, grupoId, codigo: codigoFiel(documento) } });

    // Cargos: los marcados + uno nuevo escrito a mano
    const cargos = new Set(fd.getAll("cargos").map(String).filter(Boolean));
    if (otroCargo) {
      const nuevo = await prisma.area.upsert({ where: { nombre: otroCargo }, create: { nombre: otroCargo }, update: { estado: "ACTIVO" } });
      cargos.add(nuevo.id);
    }
    await prisma.$transaction([
      prisma.miembroArea.deleteMany({ where: { fielId: fiel.id, areaId: { notIn: [...cargos] } } }),
      prisma.miembroArea.createMany({ data: [...cargos].map((areaId) => ({ fielId: fiel.id, areaId })), skipDuplicates: true }),
    ]);

    revalidatePath("/workspace/fieles");
    revalidatePath("/workspace/grupos");
    revalidatePath("/workspace/mi-grupo");
    return { id: fiel.id, codigo: fiel.codigo };
  });
}

export async function cambiarEstadoFiel(id: string, estado: EstadoRegistro) {
  return runAction(async () => {
    await requireUser(R.PASTORAL);
    await prisma.fiel.update({ where: { id }, data: { estado } });
    revalidatePath("/workspace/fieles");
    return null;
  });
}

// ── Catálogo de cargos / ministerios ─────────────────────────

export async function crearCargo(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    const { nombre } = z.object({ nombre: zTexto("Escribe el nombre del cargo") }).parse(formObj(fd));
    await prisma.area.upsert({ where: { nombre }, create: { nombre }, update: { estado: "ACTIVO" } });
    revalidatePath("/workspace/fieles");
    return null;
  });
}

export async function eliminarCargo(id: string) {
  return runAction(async () => {
    await requireUser(R.ADMIN);
    await prisma.area.delete({ where: { id } }); // quita el cargo a quienes lo tenían
    revalidatePath("/workspace/fieles");
    return null;
  });
}
