"use server";

import { EstadoCivil, EstadoRegistro } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { formObj, zBool, zCorreoOpc, zFechaOpc, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
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
});

export async function guardarFiel(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.PASTORAL);
    const { documento, ...data } = fielSchema.parse(formObj(fd));
    const fiel = id
      ? await prisma.fiel.update({ where: { id }, data })
      : await prisma.fiel.create({ data: { ...data, codigo: codigoFiel(documento) } });
    revalidatePath("/workspace/fieles");
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
