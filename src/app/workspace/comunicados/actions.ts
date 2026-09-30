"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zBool, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { whatsappConfigurado } from "@/lib/server/whatsapp";
import { borrarArchivo, guardarArchivo, leerArchivo, leerUpload } from "@/lib/server/storage";
import { enviarPrueba, estaProcesando, iniciarEnvio, reanudar, reintentarFallidos } from "@/server/comunicados";

const MAX_IMAGENES = 4;

function refrescar(id?: string) {
  revalidatePath("/workspace/comunicados");
  if (id) revalidatePath(`/workspace/comunicados/${id}`);
}

const schema = z
  .object({
    asunto: zTexto("Escribe el asunto").max(150),
    cuerpo: zTexto("Escribe el mensaje").max(5000),
    enlaceUrl: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().refine((u) => u.startsWith("/") || /^https?:\/\//.test(u), "El enlace debe empezar por / o https://").nullable(),
    ),
    enlaceTexto: zTextoOpc,
    porCorreo: zBool,
    porWhatsapp: zBool,
    tipoDestino: z.enum(["todos", "rol", "grupo", "curso", "cargo"]),
    valorDestino: zTextoOpc,
  })
  // Sin la API de WhatsApp configurada, ese canal se ignora
  .transform((d) => ({ ...d, porWhatsapp: d.porWhatsapp && whatsappConfigurado() }))
  .refine((d) => d.porCorreo || d.porWhatsapp, { message: "Elige al menos un canal: correo o WhatsApp." })
  .refine((d) => d.tipoDestino === "todos" || !!d.valorDestino, { message: "Elige a quién va dirigido." });

async function editable(id: string) {
  const c = await prisma.comunicado.findUniqueOrThrow({ where: { id } });
  if (c.estado !== "BORRADOR") throw new ErrorNegocio("Este comunicado ya se envió; duplícalo para enviar uno parecido.");
  return c;
}

export async function guardarComunicado(id: string | null, fd: FormData) {
  return runAction(async () => {
    const user = await requireUser(R.COMUNICADOS);
    const { tipoDestino, valorDestino, ...d } = schema.parse(formObj(fd));
    const destinatarios = { tipo: tipoDestino, valor: tipoDestino === "todos" ? null : valorDestino };

    const actual = id ? await editable(id) : null;
    const c = actual
      ? await prisma.comunicado.update({ where: { id: actual.id }, data: { ...d, destinatarios } })
      : await prisma.comunicado.create({ data: { ...d, destinatarios, creadoPorId: user.fielId } });

    // Imágenes: se quitan las marcadas y se agregan las nuevas (máx. 4)
    const quitar = new Set(fd.getAll("quitarImagen").map(String));
    let imagenes = c.imagenes.filter((r) => !quitar.has(r));
    for (const r of c.imagenes.filter((r) => quitar.has(r))) await borrarArchivo(r);
    const nuevas = fd.getAll("imagenes").filter((f): f is File => typeof f !== "string" && f.size > 0);
    if (imagenes.length + nuevas.length > MAX_IMAGENES) throw new ErrorNegocio(`Máximo ${MAX_IMAGENES} imágenes por comunicado.`);
    for (const f of nuevas) {
      const { nombre, buffer } = await leerUpload(f, { tipos: ["image/png", "image/jpeg", "image/webp"], maxMB: 3, etiqueta: "las imágenes" });
      imagenes.push(await guardarArchivo(`comunicados/${c.id}/${Date.now()}-${imagenes.length}${path.extname(nombre).toLowerCase() || ".jpg"}`, buffer));
    }
    imagenes = imagenes.slice(0, MAX_IMAGENES);
    await prisma.comunicado.update({ where: { id: c.id }, data: { imagenes } });

    refrescar(c.id);
    return { id: c.id };
  });
}

export async function probarComunicado(id: string) {
  return runAction(async () => {
    const user = await requireUser(R.COMUNICADOS);
    const resultados = await enviarPrueba(id, user.fielId);
    if (resultados.length === 0) throw new ErrorNegocio("El comunicado no tiene canales activos.");
    return resultados.join(" · ");
  });
}

export async function enviarComunicado(id: string) {
  return runAction(async () => {
    await requireUser(R.COMUNICADOS);
    await editable(id);
    await iniciarEnvio(id);
    refrescar(id);
    return null;
  });
}

export async function reintentarComunicado(id: string) {
  return runAction(async () => {
    await requireUser(R.COMUNICADOS);
    await reintentarFallidos(id);
    refrescar(id);
    return null;
  });
}

export async function reanudarComunicado(id: string) {
  return runAction(async () => {
    await requireUser(R.COMUNICADOS);
    if (!estaProcesando(id)) reanudar(id);
    refrescar(id);
    return null;
  });
}

/** Copia un comunicado (ya enviado o no) como borrador nuevo, con sus imágenes. */
export async function duplicarComunicado(id: string) {
  return runAction(async () => {
    const user = await requireUser(R.COMUNICADOS);
    const c = await prisma.comunicado.findUniqueOrThrow({ where: { id } });
    const copia = await prisma.comunicado.create({
      data: {
        asunto: `${c.asunto} (copia)`.slice(0, 150),
        cuerpo: c.cuerpo,
        enlaceUrl: c.enlaceUrl,
        enlaceTexto: c.enlaceTexto,
        porCorreo: c.porCorreo,
        porWhatsapp: c.porWhatsapp,
        destinatarios: c.destinatarios ?? { tipo: "todos" },
        creadoPorId: user.fielId,
      },
    });
    const imagenes: string[] = [];
    for (const [i, r] of c.imagenes.entries()) {
      try {
        imagenes.push(await guardarArchivo(`comunicados/${copia.id}/${Date.now()}-${i}${path.extname(r)}`, await leerArchivo(r)));
      } catch {}
    }
    await prisma.comunicado.update({ where: { id: copia.id }, data: { imagenes } });
    refrescar();
    return { id: copia.id };
  });
}

export async function eliminarComunicado(id: string) {
  return runAction(async () => {
    await requireUser(R.COMUNICADOS);
    const c = await prisma.comunicado.findUniqueOrThrow({ where: { id } });
    if (c.estado === "ENVIANDO") throw new ErrorNegocio("No se puede eliminar mientras se está enviando.");
    await prisma.comunicado.delete({ where: { id } });
    for (const r of c.imagenes) await borrarArchivo(r);
    refrescar();
    return null;
  });
}
