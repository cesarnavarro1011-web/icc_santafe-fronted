"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runAction } from "@/lib/server/action";
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
    await prisma.peticionOracion.create({
      data: { nombre: d.anonima ? "Anónimo" : d.nombre, contacto: d.anonima ? null : d.contacto || null, mensaje: d.mensaje, anonima: d.anonima },
    });
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
