"use server";

import { EstadoCivil } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zFechaOpc, zTexto, zTextoOpc } from "@/lib/server/form";
import { hashPassword, validarPassword, verifyPassword } from "@/lib/server/password";
import { requireUser } from "@/lib/server/session";
import { borrarArchivo, carpetaFiel, guardarArchivo, leerUpload } from "@/lib/server/storage";

// ID y correo no se editan aquí (igual que antes: "contacta al pastor para cambiarlos")
const perfilSchema = z.object({
  nombre: zTexto("El nombre es obligatorio"),
  apellido: zTexto("El apellido es obligatorio"),
  celular: zTextoOpc,
  direccion: zTextoOpc,
  fechaNacimiento: zFechaOpc,
  estadoCivil: z.preprocess((v) => (v === "" ? null : v), z.enum(EstadoCivil).nullable()),
});

export async function actualizarPerfil(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const data = perfilSchema.parse(formObj(fd));
    await prisma.fiel.update({ where: { id: user.fielId }, data });
    revalidatePath("/workspace/perfil");
    return null;
  });
}

const passwordSchema = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual"),
    nueva: z.string(),
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, { message: "Las contraseñas no coinciden" });

export async function cambiarPassword(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const d = passwordSchema.parse(formObj(fd));
    validarPassword(d.nueva);
    const u = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(d.actual, u.passwordHash)).ok) throw new ErrorNegocio("La contraseña actual no es correcta.");
    if (d.actual === d.nueva) throw new ErrorNegocio("La nueva contraseña debe ser diferente a la actual.");
    await prisma.usuario.update({
      where: { id: u.id },
      data: { passwordHash: await hashPassword(d.nueva), debeCambiarPassword: false },
    });
    return null;
  });
}

/** Antes guardarFirmaArchivo(): PNG en <carpeta del fiel>/firmas/firma.png */
export async function subirFirma(fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(["SUPERADMIN", "PASTOR", "SUPERVISOR", "MAESTRO"]);
    const { buffer } = await leerUpload(fd.get("firma"), { tipos: ["image/png"], maxMB: 2, etiqueta: "tu firma en PNG" });
    const u = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id }, include: { fiel: true } });
    const ruta = await guardarArchivo(`${carpetaFiel(u.fiel)}/firmas/firma.png`, buffer);
    await prisma.usuario.update({ where: { id: u.id }, data: { firmaPath: ruta } });
    revalidatePath("/workspace/perfil");
    return null;
  });
}

export async function quitarFirma() {
  return runAction(async () => {
    const user = await requireUser();
    const u = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id } });
    await borrarArchivo(u.firmaPath);
    await prisma.usuario.update({ where: { id: u.id }, data: { firmaPath: null } });
    revalidatePath("/workspace/perfil");
    return null;
  });
}
