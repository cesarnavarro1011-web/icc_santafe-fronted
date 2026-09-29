import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ============================================================
//  Contenido publicado de la página web (lo que ve el visitante)
// ============================================================

/** URL pública de una imagen: subida al disco (/api/publico/...) o de /public. */
export function urlImagen(x: { imagenPath?: string | null; imagenUrl?: string | null; updatedAt?: Date }) {
  if (x.imagenPath) return `/api/publico/${x.imagenPath}${x.updatedAt ? `?v=${x.updatedAt.getTime()}` : ""}`;
  return x.imagenUrl || null;
}

/** Publicado y dentro de sus fechas de publicación. */
function vigente(): Prisma.WebSlideWhereInput & Prisma.WebAnuncioWhereInput {
  const ahora = new Date();
  return {
    estado: "PUBLICADO",
    AND: [
      { OR: [{ publicarDesde: null }, { publicarDesde: { lte: ahora } }] },
      { OR: [{ publicarHasta: null }, { publicarHasta: { gte: ahora } }] },
    ],
  };
}

export async function slidesPublicas() {
  const slides = await prisma.webSlide.findMany({ where: vigente(), orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
  return slides.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    subtitulo: s.subtitulo,
    descripcion: s.descripcion,
    imagen: urlImagen(s),
    ctaTexto: s.ctaTexto,
    ctaLink: s.ctaLink,
  }));
}

function mapAnuncio(a: Prisma.WebAnuncioGetPayload<object>) {
  // El id incluye la fecha de edición: si se edita un anuncio cerrado, vuelve a mostrarse
  return { id: `${a.id}-${a.updatedAt.getTime()}`, texto: a.texto, enlace: a.enlace, textoEnlace: a.textoEnlace, color: a.color };
}

export async function anuncioPublico() {
  const a = await prisma.webAnuncio.findFirst({ where: vigente(), orderBy: { updatedAt: "desc" } });
  return a ? mapAnuncio(a) : null;
}

/** Todos los anuncios vigentes (los más recientes primero): rotan en la barra de la portada. */
export async function anunciosPublicos() {
  const as = await prisma.webAnuncio.findMany({ where: vigente(), orderBy: { updatedAt: "desc" }, take: 10 });
  return as.map(mapAnuncio);
}

export async function eventosPublicos() {
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  const eventos = await prisma.webEvento.findMany({
    where: { estado: "PUBLICADO", OR: [{ fecha: { gte: hoy } }, { recurrente: true }] },
    orderBy: [{ destacado: "desc" }, { fecha: "asc" }],
    take: 24,
  });
  return eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    descripcion: e.descripcion,
    fecha: e.fecha.toISOString().slice(0, 10),
    hora: e.hora,
    lugar: e.lugar,
    categoria: e.categoria,
    recurrente: e.recurrente,
    destacado: e.destacado,
    imagen: urlImagen(e),
  }));
}

/** ID de YouTube de una URL (watch?v=, youtu.be/, /embed/, /shorts/, /live/). */
export function idYoutube(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export function idVimeo(url: string) {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null;
}

export async function predicasPublicas() {
  const predicas = await prisma.webPredica.findMany({ where: { estado: "PUBLICADO" }, orderBy: { fecha: "desc" }, take: 60 });
  return predicas.map((p) => {
    const yt = idYoutube(p.videoUrl);
    const vimeo = idVimeo(p.videoUrl);
    return {
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      predicador: p.predicador,
      fecha: p.fecha.toISOString().slice(0, 10),
      serie: p.serie,
      etiquetas: p.etiquetas,
      destacada: p.destacada,
      vistas: p.vistas,
      videoUrl: p.videoUrl,
      embed: yt ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0` : vimeo ? `https://player.vimeo.com/video/${vimeo}?autoplay=1` : null,
      imagen: p.imagenPath ? urlImagen(p) : yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null,
    };
  });
}

export async function ministeriosPublicos() {
  const ms = await prisma.webMinisterio.findMany({ where: { estado: "PUBLICADO" }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  return ms.map(mapMinisterio);
}

export async function ministerioPublico(slugOId: string) {
  const m = await prisma.webMinisterio.findFirst({ where: { estado: "PUBLICADO", OR: [{ slug: slugOId }, { id: slugOId }] } });
  return m ? mapMinisterio(m) : null;
}

function mapMinisterio(m: Prisma.WebMinisterioGetPayload<object>) {
  return {
    id: m.id,
    slug: m.slug,
    nombre: m.nombre,
    descripcion: m.descripcion,
    publico: m.publico,
    horario: m.horario,
    lugar: m.lugar,
    lider: m.lider,
    correo: m.correo,
    imagen: urlImagen(m),
  };
}

// ── Datos de la iglesia (contacto, Nosotros) ─────────────────

export type Estadistica = { valor: string; etiqueta: string };
export type Horario = { dia: string; detalle: string[] };

/**
 * "Domingos\n10:00 a. m. — Servicio\n\nMiércoles\n7:00 p. m. — Oración" →
 * [{ dia: "Domingos", detalle: ["10:00 a. m. — Servicio"] }, …]
 */
export function parsearHorarios(texto: string | null | undefined): Horario[] {
  return (texto ?? "")
    .split(/\n\s*\n/)
    .map((bloque) => bloque.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lineas) => lineas.length > 0)
    .map(([dia, ...detalle]) => ({ dia, detalle }));
}

const lineas = (t: string | null | undefined) => (t ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/** Enlace wa.me a partir del número de WhatsApp (indicativo 57 si viene sin él). */
export function enlaceWhatsApp(numero: string | null | undefined) {
  if (!numero) return null;
  let n = numero.replace(/\D/g, "");
  if (n.length === 10) n = `57${n}`;
  return n.length >= 11 ? `https://wa.me/${n}` : null;
}

export async function obtenerSitio() {
  return (await prisma.webSitio.findUnique({ where: { id: "principal" } })) ?? (await prisma.webSitio.create({ data: { id: "principal" } }));
}

/** Datos públicos de la iglesia: lo que vacío no se muestra. */
export async function sitioPublico() {
  const s = await obtenerSitio();
  const estadisticas = (Array.isArray(s.estadisticas) ? s.estadisticas : []) as Estadistica[];
  return {
    nombre: s.nombre,
    lema: s.lema,
    descripcion: s.descripcion,
    telefono: s.telefono,
    whatsapp: s.whatsapp,
    whatsappUrl: enlaceWhatsApp(s.whatsapp),
    correo: s.correo,
    direccion: s.direccion,
    ciudad: s.ciudad,
    mapaUrl: s.mapaUrl,
    emergencias: s.emergencias,
    horarios: parsearHorarios(s.horarios),
    redes: {
      facebook: s.facebook,
      instagram: s.instagram,
      youtube: s.youtube,
      tiktok: s.tiktok,
    },
    nosotros: {
      titulo: s.nosotrosTitulo,
      texto: s.nosotrosTexto,
      imagen: s.nosotrosImagenPath ? urlImagen({ imagenPath: s.nosotrosImagenPath, updatedAt: s.updatedAt }) : null,
      mision: s.mision,
      vision: s.vision,
      valores: lineas(s.valores),
      estadisticas: estadisticas.filter((e) => e?.valor && e?.etiqueta),
    },
  };
}

export async function historiaPublica() {
  const etapas = await prisma.webHistoria.findMany({ where: { estado: "PUBLICADO" }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
  return etapas.map((e) => ({ id: e.id, titulo: e.titulo, periodo: e.periodo, texto: e.texto, imagen: urlImagen(e) }));
}

export async function personasPublicas() {
  const ps = await prisma.webPersona.findMany({ where: { estado: "PUBLICADO" }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
  const map = (p: (typeof ps)[number]) => ({ id: p.id, nombre: p.nombre, cargo: p.cargo, descripcion: p.descripcion, imagen: urlImagen(p) });
  return {
    fundadores: ps.filter((p) => p.seccion === "fundadores").map(map),
    actuales: ps.filter((p) => p.seccion === "actuales").map(map),
    equipo: ps.filter((p) => p.seccion === "equipo").map(map),
  };
}

export type SitioPublico = Awaited<ReturnType<typeof sitioPublico>>;
export type PersonaPublica = Awaited<ReturnType<typeof personasPublicas>>["equipo"][number];

export type SlidePublica =Awaited<ReturnType<typeof slidesPublicas>>[number];
export type EventoPublico = Awaited<ReturnType<typeof eventosPublicos>>[number];
export type PredicaPublica = Awaited<ReturnType<typeof predicasPublicas>>[number];
export type MinisterioPublico = Awaited<ReturnType<typeof ministeriosPublicos>>[number];
export type AnuncioPublico = NonNullable<Awaited<ReturnType<typeof anuncioPublico>>>;
