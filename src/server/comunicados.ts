import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import path from "path";
import type { CanalEnvio, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enviarCorreo, esc, plantillaCorreo, urlSitio, type Adjunto } from "@/lib/server/mail";
import { leerArchivo, MIME_POR_EXT } from "@/lib/server/storage";
import { enviarInformativoWhatsApp } from "@/lib/server/whatsapp";

// ============================================================
//  Comunicados: avisos informativos masivos por correo y WhatsApp.
//  El envío corre en segundo plano en el servidor, con pocas conexiones a la
//  vez para no saturar el SMTP ni la API de WhatsApp; la página muestra el avance.
// ============================================================

export type TipoDestino = "todos" | "rol" | "grupo" | "curso" | "cargo";
export type Destinatarios = { tipo: TipoDestino; valor?: string | null };

export function leerDestinatarios(json: Prisma.JsonValue): Destinatarios {
  const d = (json ?? {}) as { tipo?: string; valor?: string | null };
  const tipos: TipoDestino[] = ["todos", "rol", "grupo", "curso", "cargo"];
  return { tipo: tipos.includes(d.tipo as TipoDestino) ? (d.tipo as TipoDestino) : "todos", valor: d.valor ?? null };
}

/** Filtro de fieles según los destinatarios elegidos (siempre solo fieles activos). */
export function filtroDestinatarios(d: Destinatarios): Prisma.FielWhereInput {
  const base: Prisma.FielWhereInput = { estado: "ACTIVO" };
  switch (d.tipo) {
    case "rol":
      return { ...base, usuario: { rol: d.valor as never, activo: true } };
    case "grupo":
      return { ...base, grupoId: d.valor ?? "__ninguno__" };
    case "curso":
      return { ...base, matriculas: { some: { cursoId: d.valor ?? "__ninguno__", estado: { in: ["EN_PROGRESO", "APROBADO"] } } } };
    case "cargo":
      return { ...base, areas: { some: { areaId: d.valor ?? "__ninguno__" } } };
    default:
      return base;
  }
}

/** Cuántos recibirán el comunicado por cada canal. */
export async function contarDestinatarios(d: Destinatarios) {
  const where = filtroDestinatarios(d);
  const [total, conCorreo, conCelular, deBaja] = await Promise.all([
    prisma.fiel.count({ where }),
    prisma.fiel.count({ where: { ...where, recibeInformativos: true, correo: { not: null } } }),
    prisma.fiel.count({ where: { ...where, recibeInformativos: true, celular: { not: null } } }),
    prisma.fiel.count({ where: { ...where, recibeInformativos: false } }),
  ]);
  return { total, conCorreo, conCelular, deBaja };
}

// ── Formato del cuerpo ───────────────────────────────────────

const personalizar = (texto: string, nombre: string) => texto.replace(/\{\{\s*nombre\s*\}\}/gi, nombre);

/**
 * Texto del comunicado → HTML seguro: párrafos (línea en blanco), saltos de línea,
 * **negrita**, enlaces automáticos y {{nombre}}.
 */
export function cuerpoHtml(texto: string, nombre: string) {
  return personalizar(texto, nombre)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      let h = esc(p);
      h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#4f46e5;">$1</a>');
      return `<p style="margin:0 0 12px;">${h.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

/** Versión en texto para WhatsApp (sin asteriscos dobles, con {{nombre}}). */
export function cuerpoTexto(texto: string, nombre: string) {
  return personalizar(texto, nombre).replace(/\*\*(.+?)\*\*/g, "*$1*").trim();
}

// ── Darse de baja ────────────────────────────────────────────

const secreto = () => process.env.NEXTAUTH_SECRET || "sin-secreto";

export function tokenBaja(fielId: string) {
  return createHmac("sha256", secreto()).update(`baja:${fielId}`).digest("base64url").slice(0, 32);
}

export function tokenBajaValido(fielId: string, token: string) {
  const a = Buffer.from(tokenBaja(fielId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const urlBaja = (fielId: string) => urlSitio(`/api/publico/baja?f=${encodeURIComponent(fielId)}&t=${tokenBaja(fielId)}`);

// ── Armar y enviar un mensaje ────────────────────────────────

type ComunicadoEnvio = Prisma.ComunicadoGetPayload<object>;
type Persona = { id: string; nombre: string; correo: string | null; celular: string | null };

async function adjuntosImagenes(c: ComunicadoEnvio): Promise<Adjunto[]> {
  const adjuntos: Adjunto[] = [];
  for (const [i, ruta] of c.imagenes.entries()) {
    try {
      const ext = path.extname(ruta).toLowerCase();
      adjuntos.push({ filename: `imagen-${i + 1}${ext}`, content: await leerArchivo(ruta), cid: `img${i}@comunicado`, contentType: MIME_POR_EXT[ext] });
    } catch {
      // imagen borrada del disco: se envía sin ella
    }
  }
  return adjuntos;
}

function htmlComunicado(c: ComunicadoEnvio, p: Persona, adjuntos: Adjunto[]) {
  const imagenes = adjuntos
    .map((a) => `<p style="margin:0 0 12px;"><img src="cid:${a.cid}" alt="" style="max-width:100%;height:auto;border-radius:8px;display:block;"/></p>`)
    .join("");
  const pie = `Recibes este mensaje porque perteneces a nuestra iglesia. <a href="${esc(urlBaja(p.id))}" style="color:#94a3b8;">No quiero recibir más comunicados</a>.`;
  return plantillaCorreo(esc(c.asunto), `${imagenes}${cuerpoHtml(c.cuerpo, p.nombre)}`, {
    subtitulo: "Comunicado",
    boton: c.enlaceUrl ? { texto: c.enlaceTexto || "Ver más", url: c.enlaceUrl } : undefined,
    pie,
  });
}

async function enviarA(c: ComunicadoEnvio, p: Persona, canal: CanalEnvio, adjuntos: Adjunto[]) {
  if (canal === "CORREO") {
    if (!p.correo) return { ok: false as const, error: "Sin correo" };
    return enviarCorreo({
      to: p.correo,
      tipo: "comunicado",
      subject: c.asunto,
      html: htmlComunicado(c, p, adjuntos),
      attachments: adjuntos,
      // Botón "Cancelar suscripción" de Gmail/Outlook (baja con un clic)
      headers: { "List-Unsubscribe": `<${urlBaja(p.id)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
  }
  if (!p.celular) return { ok: false as const, error: "Sin celular" };
  const enlace = c.enlaceUrl ? ` ${c.enlaceTexto || "Ver más"}: ${/^https?:/.test(c.enlaceUrl) ? c.enlaceUrl : urlSitio(c.enlaceUrl)}` : "";
  return enviarInformativoWhatsApp(p.celular, { nombre: p.nombre, titulo: c.asunto, mensaje: cuerpoTexto(c.cuerpo, p.nombre) + enlace });
}

/** Envía el comunicado solo a quien lo está preparando (para revisarlo). */
export async function enviarPrueba(comunicadoId: string, fielId: string) {
  const [c, p] = await Promise.all([
    prisma.comunicado.findUniqueOrThrow({ where: { id: comunicadoId } }),
    prisma.fiel.findUniqueOrThrow({ where: { id: fielId }, select: { id: true, nombre: true, correo: true, celular: true } }),
  ]);
  const adjuntos = await adjuntosImagenes(c);
  const resultados: string[] = [];
  if (c.porCorreo) {
    const r = await enviarA({ ...c, asunto: `[PRUEBA] ${c.asunto}` }, p, "CORREO", adjuntos);
    resultados.push(r.ok ? `correo a ${p.correo}` : `correo: ${r.error}`);
  }
  if (c.porWhatsapp) {
    const r = await enviarA(c, p, "WHATSAPP", adjuntos);
    resultados.push(r.ok ? `WhatsApp a ${p.celular}` : `WhatsApp: ${r.error}`);
  }
  return resultados;
}

// ── Envío masivo en segundo plano ────────────────────────────

const enCurso = new Set<string>();
export const estaProcesando = (id: string) => enCurso.has(id);

/** Crea los envíos pendientes (uno por persona y canal) y arranca el proceso. */
export async function iniciarEnvio(comunicadoId: string) {
  const c = await prisma.comunicado.findUniqueOrThrow({ where: { id: comunicadoId } });
  const personas = await prisma.fiel.findMany({
    where: filtroDestinatarios(leerDestinatarios(c.destinatarios)),
    select: { id: true, correo: true, celular: true, recibeInformativos: true },
  });

  const filas: Prisma.EnvioComunicadoCreateManyInput[] = [];
  for (const p of personas) {
    const canales: [CanalEnvio, string | null][] = [];
    if (c.porCorreo) canales.push(["CORREO", p.correo]);
    if (c.porWhatsapp) canales.push(["WHATSAPP", p.celular]);
    for (const [canal, destino] of canales) {
      const omitir = !p.recibeInformativos ? "Se dio de baja de los comunicados" : !destino ? (canal === "CORREO" ? "Sin correo" : "Sin celular") : null;
      filas.push({ comunicadoId, fielId: p.id, canal, destino, estado: omitir ? "OMITIDO" : "PENDIENTE", error: omitir });
    }
  }
  await prisma.envioComunicado.createMany({ data: filas, skipDuplicates: true });
  await prisma.comunicado.update({ where: { id: comunicadoId }, data: { estado: "ENVIANDO", enviadoAt: c.enviadoAt ?? new Date() } });
  await actualizarContadores(comunicadoId);
  void procesar(comunicadoId); // en segundo plano: no se espera
}

/** Vuelve a poner en cola los envíos fallidos y retoma el proceso. */
export async function reintentarFallidos(comunicadoId: string) {
  await prisma.envioComunicado.updateMany({ where: { comunicadoId, estado: "FALLIDO" }, data: { estado: "PENDIENTE", error: null } });
  await prisma.comunicado.update({ where: { id: comunicadoId }, data: { estado: "ENVIANDO" } });
  await actualizarContadores(comunicadoId);
  void procesar(comunicadoId);
}

/** Retoma un envío que quedó a medias (por ejemplo, si se reinició el servidor). */
export function reanudar(comunicadoId: string) {
  void procesar(comunicadoId);
}

async function actualizarContadores(comunicadoId: string) {
  const grupos = await prisma.envioComunicado.groupBy({ by: ["estado"], where: { comunicadoId }, _count: true });
  const n = (e: string) => grupos.find((g) => g.estado === e)?._count ?? 0;
  const total = grupos.reduce((s, g) => s + g._count, 0);
  return prisma.comunicado.update({
    where: { id: comunicadoId },
    data: { total, enviados: n("ENVIADO"), fallidos: n("FALLIDO"), omitidos: n("OMITIDO") },
  });
}

const PARALELO = 3; // envíos simultáneos
const PAUSA_MS = 250; // respiro entre tandas (límites de SMTP / Meta)

async function procesar(comunicadoId: string) {
  if (enCurso.has(comunicadoId)) return;
  enCurso.add(comunicadoId);
  try {
    const c = await prisma.comunicado.findUniqueOrThrow({ where: { id: comunicadoId } });
    const adjuntos = await adjuntosImagenes(c);
    for (;;) {
      const tanda = await prisma.envioComunicado.findMany({ where: { comunicadoId, estado: "PENDIENTE" }, take: PARALELO });
      if (tanda.length === 0) break;
      const personas = await prisma.fiel.findMany({
        where: { id: { in: tanda.map((t) => t.fielId) } },
        select: { id: true, nombre: true, correo: true, celular: true },
      });
      await Promise.all(
        tanda.map(async (e) => {
          const p = personas.find((x) => x.id === e.fielId);
          const r = p ? await enviarA(c, p, e.canal, adjuntos) : { ok: false as const, error: "El fiel ya no existe" };
          await prisma.envioComunicado.update({
            where: { id: e.id },
            data: r.ok ? { estado: "ENVIADO", error: null, enviadoAt: new Date() } : { estado: "FALLIDO", error: r.error.slice(0, 300) },
          });
        }),
      );
      await actualizarContadores(comunicadoId);
      await new Promise((ok) => setTimeout(ok, PAUSA_MS));
    }
    await prisma.comunicado.update({ where: { id: comunicadoId }, data: { estado: "ENVIADO" } });
    await actualizarContadores(comunicadoId);
  } catch (e) {
    console.error("[comunicados] error procesando", comunicadoId, e);
  } finally {
    enCurso.delete(comunicadoId);
  }
}
