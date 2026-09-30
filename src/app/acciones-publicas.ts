"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runAction } from "@/lib/server/action";
import { avisarIglesia } from "@/lib/server/aviso-iglesia";
import { ErrorNegocio } from "@/lib/server/errors";
import { ipDe, minutosBloqueo, registrarIntento } from "@/lib/server/rate-limit";

// Acciones que usa cualquier visitante de la página (sin iniciar sesión).
// Llevan límite por IP para evitar spam.

const peticionSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80),
  contacto: z.string().trim().max(120).optional(),
  mensaje: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(1500, "Máximo 1500 caracteres"),
  anonima: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  sitio: z.string().optional(), // campo trampa: los humanos no lo ven
});

export async function enviarPeticion(fd: FormData) {
  return runAction(async () => {
    const d = peticionSchema.parse(Object.fromEntries(fd));
    if (d.sitio) return null; // bot: se ignora en silencio
    const clave = `peticion:${ipDe(await headers())}`;
    const espera = minutosBloqueo(clave);
    if (espera) throw new ErrorNegocio(`Ya recibimos tus peticiones. Puedes enviar otra en ${espera} min.`);
    registrarIntento(clave, { max: 3, ventanaMs: 60 * 60_000, bloqueoMs: 60 * 60_000 });
    const p = await prisma.peticionOracion.create({
      data: { nombre: d.anonima ? "Anónimo" : d.nombre, contacto: d.anonima ? null : d.contacto || null, mensaje: d.mensaje, anonima: d.anonima },
    });
    // Aviso al WhatsApp / correo de la iglesia (lo envía el servidor: el número del visitante no se expone)
    await avisarIglesia({
      titulo: "🙏 Nueva petición de oración",
      campos: [["Nombre", p.nombre], ["Contacto", p.contacto]],
      mensaje: p.mensaje,
      ruta: "/workspace/contenido/peticiones",
    }).catch(() => false);
    return null;
  });
}

const contactoSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80),
  correo: z.preprocess((v) => (v === "" ? undefined : v), z.email("Correo inválido").max(120).optional()),
  telefono: z.string().trim().max(30).optional(),
  motivo: z.string().trim().min(1).max(60),
  asunto: z.string().trim().max(150).optional(),
  mensaje: z.string().trim().min(10, "Escribe tu mensaje (mínimo 10 caracteres)").max(2000, "Máximo 2000 caracteres"),
  sitio: z.string().optional(), // campo trampa
});

/** Formulario de Contáctanos: se guarda en la bandeja y se avisa a la iglesia por WhatsApp/correo. */
export async function enviarMensajeContacto(fd: FormData) {
  return runAction(async () => {
    const d = contactoSchema.parse(Object.fromEntries(fd));
    if (d.sitio) return null; // bot
    if (!d.correo && !d.telefono?.trim()) throw new ErrorNegocio("Déjanos un correo o un teléfono para poder responderte.");
    const clave = `contacto:${ipDe(await headers())}`;
    const espera = minutosBloqueo(clave);
    if (espera) throw new ErrorNegocio(`Ya recibimos tus mensajes. Puedes enviar otro en ${espera} min.`);
    registrarIntento(clave, { max: 5, ventanaMs: 60 * 60_000, bloqueoMs: 60 * 60_000 });

    const m = await prisma.mensajeContacto.create({
      data: { nombre: d.nombre, correo: d.correo ?? null, telefono: d.telefono || null, motivo: d.motivo, asunto: d.asunto || null, mensaje: d.mensaje },
    });
    const ok = await avisarIglesia({
      titulo: `✉️ Mensaje desde la página: ${d.motivo}`,
      campos: [["Nombre", m.nombre], ["Teléfono", m.telefono], ["Correo", m.correo], ["Asunto", m.asunto]],
      mensaje: m.mensaje,
      ruta: "/workspace/contenido/mensajes",
    }).catch(() => false);
    if (ok) await prisma.mensajeContacto.update({ where: { id: m.id }, data: { notificado: true } });
    return null;
  });
}

/** Suma una vista a la prédica (una por visitante cada 6 horas). */
export async function registrarVista(predicaId: string) {
  const clave = `vista:${predicaId}:${ipDe(await headers())}`;
  if (minutosBloqueo(clave)) return;
  registrarIntento(clave, { max: 1, ventanaMs: 6 * 3_600_000, bloqueoMs: 6 * 3_600_000 });
  await prisma.webPredica.updateMany({ where: { id: predicaId, estado: "PUBLICADO" }, data: { vistas: { increment: 1 } } });
}
