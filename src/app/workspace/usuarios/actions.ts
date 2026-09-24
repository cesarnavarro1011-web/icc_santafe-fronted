"use server";

import { Rol } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zTexto } from "@/lib/server/form";
import { hashPassword, passwordTemporal } from "@/lib/server/password";
import { requireUser, type UsuarioSesion } from "@/lib/server/session";

function validarRolAsignable(actor: UsuarioSesion, rol: Rol) {
  if (rol === "SUPERADMIN" && actor.rol !== "SUPERADMIN") throw new ErrorNegocio("Solo un superadmin puede asignar el rol superadmin.");
}

async function objetivo(actor: UsuarioSesion, usuarioId: string) {
  const u = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  if (u.id === actor.id) throw new ErrorNegocio("No puedes modificar tu propio acceso desde aquí.");
  if (u.rol === "SUPERADMIN" && actor.rol !== "SUPERADMIN") throw new ErrorNegocio("No puedes modificar a un superadmin.");
  return u;
}

const crearSchema = z.object({
  fielId: zTexto("Selecciona el fiel"),
  usuario: zTexto("Escribe el nombre de usuario")
    .regex(/^[a-zA-Z0-9._-]{3,40}$/, "Usuario: 3 a 40 caracteres, sin espacios (letras, números, . _ -)"),
  rol: z.enum(Rol),
});

/** Antes crearUsuarioAcceso(): devuelve la contraseña temporal para entregarla al fiel. */
export async function crearAcceso(fd: FormData) {
  return runAction(async () => {
    const actor = await requireUser(R.ADMIN);
    const d = crearSchema.parse(formObj(fd));
    validarRolAsignable(actor, d.rol);
    const existe = await prisma.usuario.findUnique({ where: { fielId: d.fielId } });
    if (existe) throw new ErrorNegocio("Este fiel ya tiene acceso al sistema.");
    const temporal = passwordTemporal();
    await prisma.usuario.create({
      data: { ...d, passwordHash: await hashPassword(temporal), debeCambiarPassword: true },
    });
    revalidatePath("/workspace/usuarios");
    return { usuario: d.usuario, temporal };
  });
}

export async function cambiarRol(usuarioId: string, fd: FormData) {
  return runAction(async () => {
    const actor = await requireUser(R.ADMIN);
    const { rol } = z.object({ rol: z.enum(Rol) }).parse(formObj(fd));
    await objetivo(actor, usuarioId);
    validarRolAsignable(actor, rol);
    await prisma.usuario.update({ where: { id: usuarioId }, data: { rol } });
    revalidatePath("/workspace/usuarios");
    return null;
  });
}

/** Antes adminResetPassword(): genera una temporal y obliga a cambiarla al entrar. */
export async function restablecerPassword(usuarioId: string) {
  return runAction(async () => {
    const actor = await requireUser(R.ADMIN);
    const u = await objetivo(actor, usuarioId);
    const temporal = passwordTemporal();
    await prisma.usuario.update({
      where: { id: u.id },
      data: { passwordHash: await hashPassword(temporal), debeCambiarPassword: true },
    });
    return { usuario: u.usuario, temporal };
  });
}

export async function cambiarActivo(usuarioId: string, activo: boolean) {
  return runAction(async () => {
    const actor = await requireUser(R.ADMIN);
    await objetivo(actor, usuarioId);
    await prisma.usuario.update({ where: { id: usuarioId }, data: { activo } });
    revalidatePath("/workspace/usuarios");
    return null;
  });
}
