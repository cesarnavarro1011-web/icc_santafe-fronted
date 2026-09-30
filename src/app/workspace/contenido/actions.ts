"use server";

import { EstadoPeticion, EstadoPublicacion } from "@prisma/client";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { runAction } from "@/lib/server/action";
import { ErrorNegocio } from "@/lib/server/errors";
import { formObj, zBool, zTexto, zTextoOpc } from "@/lib/server/form";
import { requireUser } from "@/lib/server/session";
import { borrarArchivo, guardarArchivo, leerUpload } from "@/lib/server/storage";
import { embedEnVivo, idVimeo, idYoutube, obtenerSitio } from "@/server/contenido";

// ── Utilidades ───────────────────────────────────────────────

function refrescarSitio() {
  revalidatePath("/", "layout"); // la web pública y el panel
}

const zEstado = z.enum(EstadoPublicacion).default("BORRADOR");
const zFechaHoraOpc = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date({ error: "Fecha inválida" }).nullable());
const zUrlOpc = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z
    .string()
    .trim()
    .refine((u) => u.startsWith("/") || /^https?:\/\//.test(u), "El enlace debe empezar por / (página del sitio) o https://")
    .nullable(),
);

/** Imagen opcional: reemplaza la anterior si llega archivo, la quita si marcan "quitarImagen". */
async function procesarImagen(fd: FormData, carpeta: string, actual: string | null | undefined) {
  const file = fd.get("imagen");
  if (file && typeof file !== "string" && file.size > 0) {
    const { nombre, buffer } = await leerUpload(file, { tipos: ["image/png", "image/jpeg", "image/webp"], maxMB: 5, etiqueta: "la imagen" });
    const ruta = await guardarArchivo(`web/${carpeta}/${Date.now()}${path.extname(nombre).toLowerCase() || ".jpg"}`, buffer);
    await borrarArchivo(actual);
    return { imagenPath: ruta };
  }
  if (fd.get("quitarImagen") === "on") {
    await borrarArchivo(actual);
    return { imagenPath: null, imagenUrl: null };
  }
  return {};
}

function validarVentana(desde: Date | null, hasta: Date | null) {
  if (desde && hasta && hasta <= desde) throw new ErrorNegocio("La fecha de fin debe ser posterior a la de inicio.");
}

// ── Portada (carrusel) ───────────────────────────────────────

const slideSchema = z.object({
  titulo: zTexto("El título es obligatorio").max(120),
  subtitulo: zTextoOpc,
  descripcion: zTextoOpc,
  ctaTexto: zTextoOpc,
  ctaLink: zUrlOpc,
  estado: zEstado,
  publicarDesde: zFechaHoraOpc,
  publicarHasta: zFechaHoraOpc,
});

export async function guardarSlide(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = slideSchema.parse(formObj(fd));
    validarVentana(d.publicarDesde, d.publicarHasta);
    if (d.ctaTexto && !d.ctaLink) throw new ErrorNegocio("Si pones texto en el botón, agrega también su enlace.");
    const actual = id ? await prisma.webSlide.findUniqueOrThrow({ where: { id } }) : null;
    const imagen = await procesarImagen(fd, "portada", actual?.imagenPath);
    if (id) await prisma.webSlide.update({ where: { id }, data: { ...d, ...imagen } });
    else {
      const ultimo = await prisma.webSlide.aggregate({ _max: { orden: true } });
      await prisma.webSlide.create({ data: { ...d, ...imagen, orden: (ultimo._max.orden ?? 0) + 1 } });
    }
    refrescarSitio();
    return null;
  });
}

// ── Anuncios ─────────────────────────────────────────────────

const anuncioSchema = z.object({
  texto: zTexto("Escribe el anuncio").max(200),
  enlace: zUrlOpc,
  textoEnlace: zTextoOpc,
  color: z.enum(["violeta", "amarillo", "azul", "rojo", "verde"]).default("violeta"),
  estado: zEstado,
  publicarDesde: zFechaHoraOpc,
  publicarHasta: zFechaHoraOpc,
});

export async function guardarAnuncio(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = anuncioSchema.parse(formObj(fd));
    validarVentana(d.publicarDesde, d.publicarHasta);
    if (id) await prisma.webAnuncio.update({ where: { id }, data: d });
    else await prisma.webAnuncio.create({ data: d });
    refrescarSitio();
    return null;
  });
}

// ── Eventos ──────────────────────────────────────────────────

const eventoSchema = z.object({
  titulo: zTexto("El título es obligatorio").max(120),
  descripcion: zTexto("Escribe una descripción"),
  fecha: z.coerce.date({ error: "Elige la fecha" }),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  lugar: zTexto("Escribe el lugar"),
  categoria: z.enum(["servicio", "evento-especial", "ministerio", "conferencia", "actividad-juvenil"]),
  recurrente: zBool,
  destacado: zBool,
  estado: zEstado,
});

export async function guardarEvento(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = eventoSchema.parse(formObj(fd));
    const actual = id ? await prisma.webEvento.findUniqueOrThrow({ where: { id } }) : null;
    const imagen = await procesarImagen(fd, "eventos", actual?.imagenPath);
    if (id) await prisma.webEvento.update({ where: { id }, data: { ...d, ...imagen } });
    else await prisma.webEvento.create({ data: { ...d, ...imagen } });
    refrescarSitio();
    return null;
  });
}

/** Copia un evento una semana después, como borrador (útil para eventos que se repiten). */
export async function duplicarEvento(id: string) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const e = await prisma.webEvento.findUniqueOrThrow({ where: { id } });
    await prisma.webEvento.create({
      data: {
        titulo: e.titulo,
        descripcion: e.descripcion,
        fecha: new Date(e.fecha.getTime() + 7 * 86_400_000),
        hora: e.hora,
        lugar: e.lugar,
        categoria: e.categoria,
        recurrente: e.recurrente,
        destacado: e.destacado,
        imagenUrl: e.imagenUrl,
        estado: "BORRADOR", // la imagen subida no se comparte: si se borra una, no afecta la otra
      },
    });
    refrescarSitio();
    return null;
  });
}

// ── Prédicas ─────────────────────────────────────────────────

const predicaSchema = z.object({
  titulo: zTexto("El título es obligatorio").max(150),
  descripcion: zTextoOpc,
  predicador: zTexto("Escribe quién predicó"),
  fecha: z.coerce.date({ error: "Elige la fecha" }),
  videoUrl: z
    .string()
    .trim()
    .refine((u) => !!idYoutube(u) || !!idVimeo(u), "Pega un enlace válido de YouTube o Vimeo"),
  serie: zTextoOpc,
  etiquetas: z.string().optional(),
  destacada: zBool,
  estado: zEstado,
});

export async function guardarPredica(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const { etiquetas, ...d } = predicaSchema.parse(formObj(fd));
    const lista = [...new Set((etiquetas ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
    const actual = id ? await prisma.webPredica.findUniqueOrThrow({ where: { id } }) : null;
    const imagen = await procesarImagen(fd, "predicas", actual?.imagenPath);
    const data = { ...d, etiquetas: lista, ...imagen };
    if (id) await prisma.webPredica.update({ where: { id }, data });
    else await prisma.webPredica.create({ data });
    refrescarSitio();
    return null;
  });
}

// ── Ministerios ──────────────────────────────────────────────

const slugDe = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^ministerio (de |del )?/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const ministerioSchema = z.object({
  nombre: zTexto("El nombre es obligatorio").max(100),
  slug: zTextoOpc,
  descripcion: zTexto("Escribe una descripción"),
  publico: zTextoOpc,
  horario: zTextoOpc,
  lugar: zTextoOpc,
  lider: zTextoOpc,
  correo: z.preprocess((v) => (v === "" ? null : v), z.email("Correo inválido").nullable().optional()),
  estado: zEstado,
});

export async function guardarMinisterio(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const { slug, ...d } = ministerioSchema.parse(formObj(fd));
    const slugFinal = slugDe(slug || d.nombre);
    if (!slugFinal) throw new ErrorNegocio("El nombre debe tener letras o números.");
    const actual = id ? await prisma.webMinisterio.findUniqueOrThrow({ where: { id } }) : null;
    const imagen = await procesarImagen(fd, "ministerios", actual?.imagenPath);
    if (id) await prisma.webMinisterio.update({ where: { id }, data: { ...d, slug: slugFinal, ...imagen } });
    else {
      const ultimo = await prisma.webMinisterio.aggregate({ _max: { orden: true } });
      await prisma.webMinisterio.create({ data: { ...d, slug: slugFinal, ...imagen, orden: (ultimo._max.orden ?? 0) + 1 } });
    }
    refrescarSitio();
    return null;
  });
}

// ── Datos de la iglesia: contacto, horarios y redes ──────────

const zCorreoOpc = z.preprocess((v) => (v === "" ? null : v), z.email("Correo inválido").nullable().optional());
const zTelefonoOpc = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .max(30)
    .refine((t) => (t.match(/\d/g) ?? []).length >= 7, "Número de teléfono inválido")
    .nullable()
    .optional(),
);
const zRedOpc = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().refine((u) => /^https:\/\//.test(u), "Los enlaces de redes deben empezar por https://").nullable().optional(),
);

const contactoSchema = z.object({
  nombre: zTexto("Escribe el nombre de la iglesia").max(120),
  lema: zTextoOpc,
  descripcion: zTextoOpc,
  telefono: zTelefonoOpc,
  whatsapp: zTelefonoOpc,
  emergencias: zTelefonoOpc,
  correo: zCorreoOpc,
  direccion: zTextoOpc,
  ciudad: zTextoOpc,
  mapaUrl: zRedOpc,
  horarios: zTextoOpc,
  facebook: zRedOpc,
  instagram: zRedOpc,
  youtube: zRedOpc,
  tiktok: zRedOpc,
});

export async function guardarContactoIglesia(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    // Cada tarjeta (identidad, contacto, ubicación, horarios, redes) envía solo sus campos
    const d = soloEnviados(contactoSchema.partial().parse(formObj(fd)), fd);
    const actual = await prisma.webSitio.findUnique({ where: { id: "principal" } });
    const { imagenPath } = await procesarImagen(fd, "contacto", actual?.contactoImagenPath);
    const data = { ...d, ...(imagenPath !== undefined ? { contactoImagenPath: imagenPath } : {}) };
    await prisma.webSitio.upsert({ where: { id: "principal" }, create: { id: "principal", ...data }, update: data });
    refrescarSitio();
    return null;
  });
}

// ── Imagen del inicio de sesión ──────────────────────────────

export async function guardarImagenLogin(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const actual = await obtenerSitio();
    const { imagenPath } = await procesarImagen(fd, "login", actual.loginImagenPath);
    if (imagenPath === undefined) throw new ErrorNegocio("Elige una imagen o marca “Quitar imagen”.");
    await prisma.webSitio.update({ where: { id: "principal" }, data: { loginImagenPath: imagenPath } });
    revalidatePath("/login");
    refrescarSitio();
    return null;
  });
}

/** Deja solo los campos que venían en el formulario, para no borrar los de otras tarjetas. */
function soloEnviados<T extends Record<string, unknown>>(datos: T, fd: FormData): Partial<T> {
  return Object.fromEntries(Object.entries(datos).filter(([k]) => fd.has(k))) as Partial<T>;
}

// ── Nosotros: textos, misión, visión, valores y cifras ───────

const nosotrosSchema = z.object({
  nosotrosTitulo: zTextoOpc,
  nosotrosTexto: zTextoOpc,
  mision: zTextoOpc,
  vision: zTextoOpc,
  valores: zTextoOpc,
});

export async function guardarNosotros(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = soloEnviados(nosotrosSchema.parse(formObj(fd)), fd);
    // Hasta 4 cifras destacadas: valor_1/etiqueta_1 … valor_4/etiqueta_4 (solo si el formulario las trae)
    const traeCifras = fd.has("valor_1");
    const estadisticas = [1, 2, 3, 4]
      .map((i) => ({ valor: String(fd.get(`valor_${i}`) ?? "").trim(), etiqueta: String(fd.get(`etiqueta_${i}`) ?? "").trim() }))
      .filter((e) => e.valor || e.etiqueta);
    if (estadisticas.some((e) => !e.valor || !e.etiqueta)) throw new ErrorNegocio("Cada cifra necesita su número y su texto.");

    const actual = await prisma.webSitio.findUnique({ where: { id: "principal" } });
    const img = await procesarImagen(fd, "nosotros", actual?.nosotrosImagenPath);
    const data = { ...d, ...(traeCifras ? { estadisticas } : {}), ...("imagenPath" in img ? { nosotrosImagenPath: img.imagenPath } : {}) };
    await prisma.webSitio.upsert({ where: { id: "principal" }, create: { id: "principal", ...data }, update: data });
    refrescarSitio();
    return null;
  });
}

// ── Nosotros: etapas de la historia ──────────────────────────

const historiaSchema = z.object({
  titulo: zTexto("Escribe el título de la etapa").max(120),
  periodo: zTextoOpc,
  texto: zTexto("Escribe el texto de la etapa"),
  estado: zEstado,
});

export async function guardarHistoria(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = historiaSchema.parse(formObj(fd));
    const actual = id ? await prisma.webHistoria.findUniqueOrThrow({ where: { id } }) : null;
    const imagen = await procesarImagen(fd, "historia", actual?.imagenPath);
    if (id) await prisma.webHistoria.update({ where: { id }, data: { ...d, ...imagen } });
    else {
      const ultimo = await prisma.webHistoria.aggregate({ _max: { orden: true } });
      await prisma.webHistoria.create({ data: { ...d, ...imagen, orden: (ultimo._max.orden ?? 0) + 1 } });
    }
    refrescarSitio();
    return null;
  });
}

// ── Nosotros: sucesión pastoral y equipo ─────────────────────

const personaSchema = z.object({
  nombre: zTexto("Escribe el nombre").max(120),
  cargo: zTextoOpc,
  descripcion: zTextoOpc,
  seccion: z.enum(["fundadores", "actuales", "equipo"], { error: "Elige dónde aparece" }),
  estado: zEstado,
});

export async function guardarPersona(id: string | null, fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = personaSchema.parse(formObj(fd));
    const actual = id ? await prisma.webPersona.findUniqueOrThrow({ where: { id } }) : null;
    const imagen = await procesarImagen(fd, "personas", actual?.imagenPath);
    if (id) await prisma.webPersona.update({ where: { id }, data: { ...d, ...imagen } });
    else {
      const ultimo = await prisma.webPersona.aggregate({ where: { seccion: d.seccion }, _max: { orden: true } });
      await prisma.webPersona.create({ data: { ...d, ...imagen, orden: (ultimo._max.orden ?? 0) + 1 } });
    }
    refrescarSitio();
    return null;
  });
}

// ── Acciones comunes: publicar, ordenar, eliminar ────────────

type Tabla = "slide" | "anuncio" | "evento" | "predica" | "ministerio" | "historia" | "persona";

function actualizarEstado(tabla: Tabla, id: string, estado: EstadoPublicacion) {
  const args = { where: { id }, data: { estado } };
  switch (tabla) {
    case "slide":
      return prisma.webSlide.update(args);
    case "anuncio":
      return prisma.webAnuncio.update(args);
    case "evento":
      return prisma.webEvento.update(args);
    case "predica":
      return prisma.webPredica.update(args);
    case "ministerio":
      return prisma.webMinisterio.update(args);
    case "historia":
      return prisma.webHistoria.update(args);
    case "persona":
      return prisma.webPersona.update(args);
  }
}

/** Borra el registro y devuelve la imagen que tenía (para borrarla del disco). */
async function borrarRegistro(tabla: Tabla, id: string): Promise<string | null> {
  const where = { id };
  switch (tabla) {
    case "slide":
      return (await prisma.webSlide.delete({ where })).imagenPath;
    case "anuncio":
      await prisma.webAnuncio.delete({ where });
      return null;
    case "evento":
      return (await prisma.webEvento.delete({ where })).imagenPath;
    case "predica":
      return (await prisma.webPredica.delete({ where })).imagenPath;
    case "ministerio":
      return (await prisma.webMinisterio.delete({ where })).imagenPath;
    case "historia":
      return (await prisma.webHistoria.delete({ where })).imagenPath;
    case "persona":
      return (await prisma.webPersona.delete({ where })).imagenPath;
  }
}

export async function cambiarPublicacion(tabla: Tabla, id: string, estado: EstadoPublicacion) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    await actualizarEstado(tabla, id, estado);
    refrescarSitio();
    return null;
  });
}

export async function eliminarContenido(tabla: Tabla, id: string) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    await borrarArchivo(await borrarRegistro(tabla, id));
    refrescarSitio();
    return null;
  });
}

export type TablaOrdenable = "slide" | "ministerio" | "historia" | "persona";

async function listaOrdenada(tabla: TablaOrdenable, id: string) {
  const orden = { orderBy: [{ orden: "asc" as const }, { createdAt: "asc" as const }], select: { id: true } };
  switch (tabla) {
    case "slide":
      return prisma.webSlide.findMany(orden);
    case "ministerio":
      return prisma.webMinisterio.findMany(orden);
    case "historia":
      return prisma.webHistoria.findMany(orden);
    case "persona": {
      // Las personas se ordenan dentro de su sección (fundadores, actuales o equipo)
      const p = await prisma.webPersona.findUniqueOrThrow({ where: { id }, select: { seccion: true } });
      return prisma.webPersona.findMany({ ...orden, where: { seccion: p.seccion } });
    }
  }
}

function fijarOrden(tabla: TablaOrdenable, id: string, orden: number) {
  const args = { where: { id }, data: { orden } };
  switch (tabla) {
    case "slide":
      return prisma.webSlide.update(args);
    case "ministerio":
      return prisma.webMinisterio.update(args);
    case "historia":
      return prisma.webHistoria.update(args);
    case "persona":
      return prisma.webPersona.update(args);
  }
}

/** Sube o baja un elemento en el orden (diapositivas, ministerios, historia, personas). */
export async function mover(tabla: TablaOrdenable, id: string, direccion: -1 | 1) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const lista = await listaOrdenada(tabla, id);
    const i = lista.findIndex((x) => x.id === id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= lista.length) return null;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    await prisma.$transaction(lista.map((x, n) => fijarOrden(tabla, x.id, n)));
    refrescarSitio();
    return null;
  });
}

// ── Peticiones de oración (bandeja del equipo) ───────────────

export async function actualizarPeticion(id: string, estado: EstadoPeticion, fd?: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const nota = fd ? String(fd.get("nota") ?? "").trim() || null : undefined;
    await prisma.peticionOracion.update({ where: { id }, data: { estado, ...(nota !== undefined ? { nota } : {}) } });
    revalidatePath("/workspace/contenido/peticiones");
    return null;
  });
}

// ── Transmisión en vivo ──────────────────────────────────────

/** "2026-09-30T12:00" (hora Colombia, sin zona) → Date. No depende de la zona horaria del servidor. */
function horaColombia(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(`${v.length === 16 ? `${v}:00` : v}-05:00`);
  if (Number.isNaN(d.getTime())) throw new ErrorNegocio("Hora de fin inválida.");
  return d;
}

const envivoSchema = z.object({
  envivoUrl: zTextoOpc,
  envivoTitulo: zTextoOpc,
  envivoDescripcion: zTextoOpc,
  envivoProxima: zTextoOpc,
  envivoHasta: zTextoOpc,
});

export async function guardarEnVivo(fd: FormData) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const d = envivoSchema.parse(formObj(fd));
    if (d.envivoUrl && !embedEnVivo(d.envivoUrl))
      throw new ErrorNegocio("El enlace no es de un video de YouTube, Facebook o Vimeo. Copia el enlace de la transmisión desde el navegador.");
    const hasta = horaColombia(d.envivoHasta);
    if (hasta && hasta <= new Date()) throw new ErrorNegocio("La hora de fin ya pasó. Déjala vacía o pon una hora futura.");
    await prisma.webSitio.update({ where: { id: "principal" }, data: { ...d, envivoHasta: hasta } });
    refrescarSitio();
    return null;
  });
}

/** Botón "Estamos en vivo" / "Terminar transmisión". */
export async function cambiarEnVivo(activo: boolean) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    const s = await obtenerSitio();
    if (activo && !s.envivoUrl) throw new ErrorNegocio("Primero guarda el enlace de la transmisión.");
    // Al terminar se limpia la hora de fin para que la próxima vez no se apague sola a destiempo
    await prisma.webSitio.update({ where: { id: "principal" }, data: activo ? { envivoActivo: true } : { envivoActivo: false, envivoHasta: null } });
    refrescarSitio();
    return null;
  });
}

// ── Mensajes de contacto (bandeja) ───────────────────────────

export async function actualizarMensaje(id: string, cambios: { leido?: boolean; archivado?: boolean }) {
  return runAction(async () => {
    await requireUser(R.CONTENIDO);
    await prisma.mensajeContacto.update({ where: { id }, data: { leido: cambios.leido, archivado: cambios.archivado } });
    revalidatePath("/workspace/contenido/mensajes");
    return null;
  });
}
