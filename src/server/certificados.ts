import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { ACADEMICO, NOMBRE_IGLESIA } from "@/lib/config";
import { fecha } from "@/lib/labels";
import { R, tieneRol } from "@/lib/roles";
import { ErrorNegocio } from "@/lib/server/errors";
import { enviarCorreo, plantillaCorreo } from "@/lib/server/mail";
import type { UsuarioSesion } from "@/lib/server/session";
import { carpetaFiel, guardarArchivo, leerArchivo } from "@/lib/server/storage";
import { asistenciaEstudiante, exigirCursoEnAlcance } from "./academico";
import { nuevoCodigo } from "./codigos";

// Flujo (igual al sistema anterior, con el Supervisor en lugar del Líder):
//   1. Maestro inicia el certificado al aprobar al estudiante (firma 1)
//   2. Supervisor del curso firma (firma 2)
//   3. Pastor firma (firma 3) → se genera el PDF, se guarda en disco y se envía por correo

export async function iniciarCertificado(user: UsuarioSesion, matriculaId: string) {
  const m = await prisma.matricula.findUniqueOrThrow({ where: { id: matriculaId } });
  await exigirCursoEnAlcance(user, m.cursoId);

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
    if (!tieneRol(user.rol, ["SUPERVISOR", ...R.ADMIN])) throw new ErrorNegocio("No puedes firmar como supervisor.");
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

async function emitirCertificado(certificadoId: string) {
  const c = await prisma.certificado.findUniqueOrThrow({
    where: { id: certificadoId },
    include: { fiel: true, curso: true },
  });
  const firmantes = await prisma.fiel.findMany({
    where: { id: { in: [c.firmaMaestroId, c.firmaSupervisorId, c.firmaPastorId].filter((x): x is string => !!x) } },
    include: { usuario: { select: { firmaPath: true } } },
  });
  const firmante = (id: string | null) => firmantes.find((f) => f.id === id);

  const pdf = await generarPdfCertificado({
    codigo: c.codigo,
    estudiante: `${c.fiel.nombre} ${c.fiel.apellido}`,
    curso: c.curso.nombre,
    fecha: new Date(),
    firmas: [
      { rol: "Maestro", fiel: firmante(c.firmaMaestroId) },
      { rol: "Supervisor", fiel: firmante(c.firmaSupervisorId) },
      { rol: "Pastor", fiel: firmante(c.firmaPastorId) },
    ].map(({ rol, fiel }) => ({
      rol,
      nombre: fiel ? `${fiel.nombre} ${fiel.apellido}` : "",
      firmaPath: fiel?.usuario?.firmaPath ?? null,
    })),
  });

  const ruta = await guardarArchivo(`${carpetaFiel(c.fiel)}/certificados/${c.codigo}.pdf`, pdf);
  await prisma.certificado.update({
    where: { id: c.id },
    data: { pdfPath: ruta, estado: "EMITIDO", emitidoAt: new Date() },
  });

  if (c.fiel.correo) {
    await enviarCorreo({
      to: c.fiel.correo,
      tipo: "certificado",
      subject: `Tu certificado de ${c.curso.nombre}`,
      html: plantillaCorreo(
        "¡Felicitaciones!",
        `<p>Hola <strong>${c.fiel.nombre}</strong>,</p>
         <p>Completaste exitosamente el curso <strong>${c.curso.nombre}</strong>. Adjuntamos tu certificado.</p>
         <p>También puedes descargarlo desde <strong>Mis cursos</strong>. ¡Que Dios te bendiga!</p>`,
      ),
      attachments: [{ filename: `Certificado_${c.codigo}.pdf`, content: Buffer.from(pdf) }],
    });
  }
}

// ── PDF ──────────────────────────────────────────────────────

type DatosPdf = {
  codigo: string;
  estudiante: string;
  curso: string;
  fecha: Date;
  firmas: { rol: string; nombre: string; firmaPath: string | null }[];
};

const VIOLETA = rgb(0.486, 0.227, 0.929);
const GRIS = rgb(0.45, 0.45, 0.5);

function centrado(page: PDFPage, texto: string, y: number, font: PDFFont, size: number, color = rgb(0.1, 0.1, 0.15)) {
  const w = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: (page.getWidth() - w) / 2, y, size, font, color });
}

async function cargarFirma(doc: PDFDocument, ruta: string | null): Promise<PDFImage | null> {
  if (!ruta) return null;
  try {
    return await doc.embedPng(await leerArchivo(ruta));
  } catch {
    return null; // firma faltante o formato inválido: se deja solo la línea
  }
}

export async function generarPdfCertificado(d: DatosPdf) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 horizontal
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: VIOLETA, borderWidth: 4 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: VIOLETA, borderWidth: 1 });

  centrado(page, "CERTIFICADO", height - 120, serifBold, 40, VIOLETA);
  centrado(page, NOMBRE_IGLESIA.toUpperCase(), height - 148, sans, 12, GRIS);
  centrado(page, "Se certifica que", height - 205, serif, 16);
  centrado(page, d.estudiante, height - 250, serifItalic, 32, VIOLETA);
  page.drawLine({
    start: { x: width / 2 - 200, y: height - 262 },
    end: { x: width / 2 + 200, y: height - 262 },
    thickness: 1,
    color: VIOLETA,
  });
  centrado(page, "completó satisfactoriamente el curso", height - 295, serif, 16);
  centrado(page, d.curso, height - 330, serifBold, 22);
  centrado(page, `Fecha: ${fecha(d.fecha)}`, height - 360, serif, 13, GRIS);

  const colW = (width - 160) / d.firmas.length;
  for (let i = 0; i < d.firmas.length; i++) {
    const f = d.firmas[i];
    const cx = 80 + colW * i + colW / 2;
    const lineaY = 110;
    const img = await cargarFirma(doc, f.firmaPath);
    if (img) {
      const escala = Math.min(140 / img.width, 55 / img.height);
      page.drawImage(img, {
        x: cx - (img.width * escala) / 2,
        y: lineaY + 4,
        width: img.width * escala,
        height: img.height * escala,
      });
    }
    page.drawLine({ start: { x: cx - 80, y: lineaY }, end: { x: cx + 80, y: lineaY }, thickness: 0.8 });
    const nombreW = serif.widthOfTextAtSize(f.nombre, 11);
    page.drawText(f.nombre, { x: cx - nombreW / 2, y: lineaY - 16, size: 11, font: serif });
    const rolW = sans.widthOfTextAtSize(f.rol, 9);
    page.drawText(f.rol, { x: cx - rolW / 2, y: lineaY - 30, size: 9, font: sans, color: GRIS });
  }

  const codigo = `N.° ${d.codigo}`;
  page.drawText(codigo, { x: width - 60 - sans.widthOfTextAtSize(codigo, 8), y: 44, size: 8, font: sans, color: GRIS });

  return doc.save();
}
