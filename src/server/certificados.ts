import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { ACADEMICO, NOMBRE_IGLESIA } from "@/lib/config";
import { R, tieneRol } from "@/lib/roles";
import { ErrorNegocio } from "@/lib/server/errors";
import { enviarCorreo, esc, plantillaCorreo } from "@/lib/server/mail";
import type { UsuarioSesion } from "@/lib/server/session";
import { carpetaFiel, guardarArchivo, leerArchivo, tipoReal } from "@/lib/server/storage";
import { asistenciaEstudiante, exigirCursoEnAlcance } from "./academico";
import { nuevoCodigo } from "./codigos";

// Flujo (igual al sistema anterior, con el Supervisor en lugar del Líder):
//   1. Maestro inicia el certificado al aprobar al estudiante (firma 1)
//   2. Supervisor del curso firma (firma 2)
//   3. Pastor firma (firma 3) → se genera el PDF, se guarda en disco y se envía por correo

export async function iniciarCertificado(user: UsuarioSesion, matriculaId: string) {
  const m = await prisma.matricula.findUniqueOrThrow({ where: { id: matriculaId } });
  await exigirCursoEnAlcance(user, m.cursoId);

  if (m.progreso < 100) {
    throw new ErrorNegocio(`Aún tiene actividades sin completar o sin calificar (progreso ${m.progreso}%).`);
  }
  if (m.notaFinal < ACADEMICO.NOTA_MIN_APROBAR) {
    throw new ErrorNegocio(`La nota final (${m.notaFinal}) es menor a ${ACADEMICO.NOTA_MIN_APROBAR}.`);
  }
  const asist = await asistenciaEstudiante(m.fielId, m.cursoId);
  if (!asist.cumple) {
    throw new ErrorNegocio(`Asistencia de ${asist.porcentaje}%: no cumple el mínimo de ${ACADEMICO.ASISTENCIA_MIN_PCT}%.`);
  }

  const existente = await prisma.certificado.findUnique({ where: { fielId_cursoId: { fielId: m.fielId, cursoId: m.cursoId } } });
  if (existente && existente.estado !== "ANULADO") throw new ErrorNegocio("Este estudiante ya tiene un certificado en proceso.");

  const ahora = new Date();
  const data = {
    matriculaId: m.id,
    firmaMaestroId: user.fielId,
    firmaMaestroAt: ahora,
    firmaSupervisorId: null,
    firmaSupervisorAt: null,
    firmaPastorId: null,
    firmaPastorAt: null,
    estado: "EN_FIRMA" as const,
    pdfPath: null,
    emitidoAt: null,
  };
  await prisma.$transaction([
    prisma.matricula.update({ where: { id: m.id }, data: { aprobadoMaestroAt: ahora } }),
    existente
      ? prisma.certificado.update({ where: { id: existente.id }, data })
      : prisma.certificado.create({ data: { ...data, codigo: nuevoCodigo("CERT"), fielId: m.fielId, cursoId: m.cursoId } }),
  ]);
}

export async function firmarCertificado(user: UsuarioSesion, certificadoId: string, como: "SUPERVISOR" | "PASTOR") {
  const c = await prisma.certificado.findUniqueOrThrow({ where: { id: certificadoId } });
  if (c.estado !== "EN_FIRMA") throw new ErrorNegocio("El certificado no está pendiente de firma.");
  if (!c.firmaMaestroAt) throw new ErrorNegocio("Falta la firma del maestro.");

  if (como === "SUPERVISOR") {
    if (!tieneRol(user.rol, R.FIRMA_SUPERVISOR)) throw new ErrorNegocio("La firma de supervisor la da el supervisor del curso.");
    await exigirCursoEnAlcance(user, c.cursoId);
    if (c.firmaSupervisorAt) throw new ErrorNegocio("Ya tiene la firma del supervisor.");
    await prisma.certificado.update({
      where: { id: c.id },
      data: { firmaSupervisorId: user.fielId, firmaSupervisorAt: new Date() },
    });
    return;
  }

  if (!tieneRol(user.rol, R.ADMIN)) throw new ErrorNegocio("Solo el pastor puede dar la firma final.");
  if (!c.firmaSupervisorAt) throw new ErrorNegocio("Falta la firma del supervisor.");
  await prisma.certificado.update({ where: { id: c.id }, data: { firmaPastorId: user.fielId, firmaPastorAt: new Date() } });
  await emitirCertificado(c.id);
}

/**
 * Genera el PDF con la plantilla actual y lo guarda en disco. Se usa al emitir y para
 * certificados emitidos sin PDF (datos migrados o de prueba) o al regenerar con la plantilla nueva.
 */
export async function generarPdfDeCertificado(certificadoId: string) {
  const c = await prisma.certificado.findUniqueOrThrow({
    where: { id: certificadoId },
    include: { fiel: true, curso: true },
  });
  if (c.estado !== "EMITIDO" && !c.firmaPastorAt) throw new ErrorNegocio("El certificado aún no tiene todas las firmas.");
  const firmantes = await prisma.fiel.findMany({
    where: { id: { in: [c.firmaMaestroId, c.firmaSupervisorId, c.firmaPastorId].filter((x): x is string => !!x) } },
    include: { usuario: { select: { firmaPath: true } } },
  });
  const firmante = (id: string | null) => firmantes.find((f) => f.id === id);

  const plantilla = await plantillaResuelta();
  const pdf = await generarPdfCertificado({
    codigo: c.codigo,
    estudiante: `${c.fiel.nombre} ${c.fiel.apellido}`,
    curso: c.curso.nombre,
    fecha: c.emitidoAt ?? new Date(),
    plantilla,
    firmas: [
      { rol: plantilla.cargos.maestro, fiel: firmante(c.firmaMaestroId) },
      { rol: plantilla.cargos.supervisor, fiel: firmante(c.firmaSupervisorId) },
      { rol: plantilla.cargos.pastor, fiel: firmante(c.firmaPastorId) },
    ].map(({ rol, fiel }) => ({
      rol,
      nombre: fiel ? `${fiel.nombre} ${fiel.apellido}` : "",
      firmaPath: fiel?.usuario?.firmaPath ?? null,
    })),
  });

  const ruta = await guardarArchivo(`${carpetaFiel(c.fiel)}/certificados/${c.codigo}.pdf`, pdf);
  await prisma.certificado.update({
    where: { id: c.id },
    data: { pdfPath: ruta, estado: "EMITIDO", emitidoAt: c.emitidoAt ?? new Date() },
  });
  return { c, pdf, ruta };
}

async function emitirCertificado(certificadoId: string) {
  const { c, pdf } = await generarPdfDeCertificado(certificadoId);

  if (c.fiel.correo) {
    await enviarCorreo({
      to: c.fiel.correo,
      tipo: "certificado",
      subject: `Tu certificado de ${c.curso.nombre}`,
      html: plantillaCorreo(
        "¡Felicitaciones!",
        `<p>Hola <strong>${esc(c.fiel.nombre)}</strong>,</p>
         <p>Completaste exitosamente el curso <strong>${esc(c.curso.nombre)}</strong>. Adjuntamos tu certificado.</p>
         <p>También puedes descargarlo desde <strong>Mis cursos</strong>. ¡Que Dios te bendiga!</p>`,
      ),
      attachments: [{ filename: `Certificado_${c.codigo}.pdf`, content: Buffer.from(pdf) }],
    });
  }
}

// ── Plantilla editable ───────────────────────────────────────

/** Textos por defecto (los del formato institucional). Lo que la plantilla deje vacío usa estos. */
export const CERT_DEFECTO = {
  subtitulo: "Ministerio de Educación Teológica y Liderazgo",
  titulo: "Certificado de Reconocimiento",
  textoIntro: "Por cuanto ha demostrado dedicación, fidelidad y excelencia académica, se otorga el presente certificado a:",
  textoPrograma: "Por haber completado satisfactoriamente los requisitos teóricos y prácticos del programa formal de capacitación ministerial en:",
  versiculo: "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad.",
  versiculoCita: "2 Timoteo 2:15",
  cargoMaestro: "Profesor",
  cargoSupervisor: "Supervisor",
  cargoPastor: "Pastor Principal",
};

export type PlantillaResuelta = {
  institucion: string;
  subtitulo: string;
  titulo: string;
  textoIntro: string;
  textoPrograma: string;
  versiculo: string | null;
  versiculoCita: string;
  lugar: string;
  cargos: { maestro: string; supervisor: string; pastor: string };
  logoPath: string | null;
  selloPath: string | null;
};

export async function obtenerPlantillaCertificado() {
  return (
    (await prisma.plantillaCertificado.findUnique({ where: { id: "principal" } })) ??
    (await prisma.plantillaCertificado.create({ data: { id: "principal" } }))
  );
}

/** Plantilla con los valores por defecto aplicados (nombre y ciudad salen de Datos de la iglesia). */
export async function plantillaResuelta(): Promise<PlantillaResuelta> {
  const [p, sitio] = await Promise.all([obtenerPlantillaCertificado(), prisma.webSitio.findUnique({ where: { id: "principal" } })]);
  const o = (v: string | null | undefined, def: string) => v?.trim() || def;
  return {
    institucion: o(p.institucion, sitio?.nombre || NOMBRE_IGLESIA),
    subtitulo: o(p.subtitulo, CERT_DEFECTO.subtitulo),
    titulo: o(p.titulo, CERT_DEFECTO.titulo),
    textoIntro: o(p.textoIntro, CERT_DEFECTO.textoIntro),
    textoPrograma: o(p.textoPrograma, CERT_DEFECTO.textoPrograma),
    versiculo: p.mostrarVersiculo ? o(p.versiculo, CERT_DEFECTO.versiculo) : null,
    versiculoCita: o(p.versiculoCita, CERT_DEFECTO.versiculoCita),
    lugar: o(p.lugar, sitio?.ciudad ? `${sitio.ciudad}, Colombia` : "Colombia"),
    cargos: {
      maestro: o(p.cargoMaestro, CERT_DEFECTO.cargoMaestro),
      supervisor: o(p.cargoSupervisor, CERT_DEFECTO.cargoSupervisor),
      pastor: o(p.cargoPastor, CERT_DEFECTO.cargoPastor),
    },
    logoPath: p.logoPath,
    selloPath: p.selloPath,
  };
}

/** PDF de ejemplo con la plantilla actual (página de la plantilla). */
export async function vistaPreviaCertificado() {
  const p = await plantillaResuelta();
  return generarPdfCertificado({
    codigo: "CERT-EJEMPLO",
    estudiante: "Nombre y Apellidos del Estudiante",
    curso: "Nombre del Curso o Programa",
    fecha: new Date(),
    plantilla: p,
    firmas: [
      { rol: p.cargos.maestro, nombre: "Nombre del Profesor", firmaPath: null },
      { rol: p.cargos.supervisor, nombre: "Nombre del Supervisor", firmaPath: null },
      { rol: p.cargos.pastor, nombre: "Nombre del Pastor", firmaPath: null },
    ],
  });
}

// ── PDF ──────────────────────────────────────────────────────

type DatosPdf = {
  codigo: string;
  estudiante: string;
  curso: string;
  fecha: Date;
  plantilla: PlantillaResuelta;
  /** En orden: profesor, supervisor, pastor */
  firmas: { rol: string; nombre: string; firmaPath: string | null }[];
};

const AZUL = rgb(0.118, 0.227, 0.373); // #1e3a5f
const DORADO = rgb(0.804, 0.643, 0.212); // #cda436
const DORADO_CLARO = rgb(0.988, 0.969, 0.918);
const VINO = rgb(0.545, 0.063, 0.063);
const TEXTO = rgb(0.2, 0.22, 0.28);
const GRIS = rgb(0.42, 0.45, 0.52);
const FONDO = rgb(0.995, 0.992, 0.984);

/** Quita caracteres que las fuentes estándar del PDF no pueden dibujar (emojis, etc.). */
function limpiar(font: PDFFont, texto: string) {
  let r = "";
  for (const ch of texto.replace(/\s+/g, " ")) {
    try {
      font.encodeText(ch);
      r += ch;
    } catch {
      /* se omite */
    }
  }
  return r.trim();
}

/** Ancho de un texto con espaciado entre letras. */
function anchoEspaciado(font: PDFFont, texto: string, size: number, espacio: number) {
  return font.widthOfTextAtSize(texto, size) + espacio * Math.max(texto.length - 1, 0);
}

function centrado(page: PDFPage, texto: string, y: number, font: PDFFont, size: number, color = TEXTO, espacio = 0) {
  const t = limpiar(font, texto);
  const w = anchoEspaciado(font, t, size, espacio);
  if (!espacio) return page.drawText(t, { x: (page.getWidth() - w) / 2, y, size, font, color });
  let x = (page.getWidth() - w) / 2;
  for (const ch of t) {
    page.drawText(ch, { x, y, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + espacio;
  }
}

/** Parte un texto en líneas que quepan en `max` puntos. */
function lineas(font: PDFFont, texto: string, size: number, max: number) {
  const out: string[] = [];
  let actual = "";
  for (const palabra of limpiar(font, texto).split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, size) > max && actual) {
      out.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) out.push(actual);
  return out;
}

/** Reduce el tamaño hasta que el texto quepa en una línea. */
function tamanoQueCabe(font: PDFFont, texto: string, size: number, max: number, min = 12) {
  let s = size;
  while (s > min && font.widthOfTextAtSize(texto, s) > max) s -= 1;
  return s;
}

async function cargarImagen(doc: PDFDocument, bytes: Uint8Array | null): Promise<PDFImage | null> {
  if (!bytes) return null;
  try {
    const b = Buffer.from(bytes);
    return tipoReal(b) === "image/png" ? await doc.embedPng(b) : await doc.embedJpg(b);
  } catch {
    return null; // imagen faltante o formato inválido: se omite
  }
}

async function leerSeguro(ruta: string | null) {
  if (!ruta) return null;
  try {
    return await leerArchivo(ruta);
  } catch {
    return null;
  }
}

/** Logo de la plantilla o, si no hay, el de la iglesia en /public. */
async function bytesLogo(ruta: string | null) {
  const subido = await leerSeguro(ruta);
  if (subido) return subido;
  try {
    return await readFile(path.join(process.cwd(), "public", "images", "logo.jpg"));
  } catch {
    return null;
  }
}

function dibujarImagen(page: PDFPage, img: PDFImage, cx: number, yBase: number, maxW: number, maxH: number, opacity = 1) {
  const escala = Math.min(maxW / img.width, maxH / img.height);
  page.drawImage(img, { x: cx - (img.width * escala) / 2, y: yBase, width: img.width * escala, height: img.height * escala, opacity });
}

export async function generarPdfCertificado(d: DatosPdf) {
  const p = d.plantilla;
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado ${d.codigo}`);
  const page = doc.addPage([842, 595]); // A4 horizontal
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const serifBoldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const { width, height } = page.getSize();
  const cx = width / 2;

  // Fondo, doble marco (azul y dorado) y esquinas doradas
  page.drawRectangle({ x: 0, y: 0, width, height, color: FONDO });
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: AZUL, borderWidth: 3.5 });
  page.drawRectangle({ x: 27, y: 27, width: width - 54, height: height - 54, borderColor: DORADO, borderWidth: 0.8 });
  const esquina = (x: number, y: number, dx: number, dy: number) => {
    page.drawLine({ start: { x, y }, end: { x: x + 34 * dx, y }, thickness: 2.5, color: DORADO });
    page.drawLine({ start: { x, y }, end: { x, y: y + 34 * dy }, thickness: 2.5, color: DORADO });
  };
  esquina(36, height - 36, 1, -1);
  esquina(width - 36, height - 36, -1, -1);
  esquina(36, 36, 1, 1);
  esquina(width - 36, 36, -1, 1);

  // Encabezado: logo, institución y subtítulo
  const logo = await cargarImagen(doc, await bytesLogo(p.logoPath));
  if (logo) dibujarImagen(page, logo, cx, height - 92, 120, 48);
  const inst = p.institucion.toUpperCase();
  centrado(page, inst, height - 112, serifBold, tamanoQueCabe(serifBold, inst, 15, 620, 10), AZUL, 2.2);
  centrado(page, p.subtitulo.toUpperCase(), height - 127, serifItalic, 8.5, GRIS, 1.2);

  // Título con separador dorado y rombo
  const titulo = p.titulo.toUpperCase();
  centrado(page, titulo, height - 172, serif, tamanoQueCabe(serif, titulo, 30, 640, 18), DORADO, 3.5);
  const yDiv = height - 188;
  page.drawLine({ start: { x: cx - 175, y: yDiv }, end: { x: cx - 10, y: yDiv }, thickness: 1, color: DORADO });
  page.drawLine({ start: { x: cx + 10, y: yDiv }, end: { x: cx + 175, y: yDiv }, thickness: 1, color: DORADO });
  page.drawSvgPath("M 0 -4.5 L 4.5 0 L 0 4.5 L -4.5 0 Z", { x: cx, y: yDiv, color: DORADO });

  // Texto introductorio, nombre del estudiante y curso
  let y = height - 232;
  for (const l of lineas(serifItalic, p.textoIntro, 11.5, 640)) {
    centrado(page, l, y, serifItalic, 11.5, GRIS);
    y -= 15;
  }
  y -= 22;
  const nombre = limpiar(serifBold, d.estudiante);
  const tamNombre = tamanoQueCabe(serifBold, nombre, 28, 560, 16);
  centrado(page, nombre, y, serifBold, tamNombre, AZUL);
  const anchoNombre = serifBold.widthOfTextAtSize(nombre, tamNombre);
  page.drawLine({ start: { x: cx - anchoNombre / 2 - 20, y: y - 9 }, end: { x: cx + anchoNombre / 2 + 20, y: y - 9 }, thickness: 1.2, color: DORADO });
  y -= 32;
  for (const l of lineas(serif, p.textoPrograma, 11, 680)) {
    centrado(page, l, y, serif, 11, TEXTO);
    y -= 14;
  }
  y -= 8;
  const curso = limpiar(serifBold, d.curso);
  centrado(page, curso, y, serifBold, tamanoQueCabe(serifBold, curso, 16, 620, 11), VINO);

  // Versículo en recuadro con barra dorada
  if (p.versiculo) {
    const textoV = lineas(serifItalic, `"${p.versiculo}"`, 9.5, 500);
    const alto = textoV.length * 12 + 26;
    const top = y - 16;
    page.drawRectangle({ x: cx - 270, y: top - alto, width: 540, height: alto, color: DORADO_CLARO });
    page.drawRectangle({ x: cx - 270, y: top - alto, width: 2.5, height: alto, color: DORADO });
    let yv = top - 14;
    for (const l of textoV) {
      centrado(page, l, yv, serifItalic, 9.5, GRIS);
      yv -= 12;
    }
    centrado(page, `— ${p.versiculoCita}`, yv - 1, serifBoldItalic, 9.5, TEXTO);
  }

  // Firmas: profesor, supervisor y pastor
  const lineaY = 112;
  const columnas = [width * 0.2, width * 0.5, width * 0.8];
  const sello = await cargarImagen(doc, await leerSeguro(p.selloPath));
  for (let i = 0; i < d.firmas.length && i < columnas.length; i++) {
    const f = d.firmas[i];
    const x = columnas[i];
    const img = await cargarImagen(doc, await leerSeguro(f.firmaPath));
    if (img) dibujarImagen(page, img, x, lineaY + 3, 150, 44);
    page.drawLine({ start: { x: x - 80, y: lineaY }, end: { x: x + 80, y: lineaY }, thickness: 0.8, color: AZUL });
    const n = limpiar(serifBold, f.nombre);
    const tn = tamanoQueCabe(serifBold, n, 11, 170, 8);
    page.drawText(n, { x: x - serifBold.widthOfTextAtSize(n, tn) / 2, y: lineaY - 14, size: tn, font: serifBold, color: AZUL });
    const r = limpiar(serif, f.rol);
    page.drawText(r, { x: x - serif.widthOfTextAtSize(r, 9) / 2, y: lineaY - 26, size: 9, font: serif, color: GRIS });
  }
  // El sello va entre la firma del supervisor y la del pastor
  if (sello) dibujarImagen(page, sello, (columnas[1] + columnas[2]) / 2, lineaY - 32, 68, 68, 0.92);

  // Pie: fecha, lugar y código
  const pie = (etiqueta: string, valor: string, x: number, alinear: "izq" | "centro" | "der") => {
    const e = `${etiqueta}: `;
    const v = limpiar(serif, valor);
    const w = serifBold.widthOfTextAtSize(e, 8.5) + serif.widthOfTextAtSize(v, 8.5);
    const x0 = alinear === "izq" ? x : alinear === "der" ? x - w : x - w / 2;
    page.drawText(e, { x: x0, y: 48, size: 8.5, font: serifBold, color: GRIS });
    page.drawText(v, { x: x0 + serifBold.widthOfTextAtSize(e, 8.5), y: 48, size: 8.5, font: serif, color: GRIS });
  };
  const fechaLarga = d.fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  pie("Fecha de emisión", fechaLarga, 80, "izq");
  pie("Lugar", p.lugar, cx, "centro");
  pie("Código de registro", d.codigo, width - 80, "der");

  return doc.save();
}
