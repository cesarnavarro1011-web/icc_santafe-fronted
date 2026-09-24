import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACADEMICO } from "@/lib/config";
import { fecha } from "@/lib/labels";
import { R, tieneRol } from "@/lib/roles";
import { enviarCorreo, plantillaCorreo } from "@/lib/server/mail";
import { ErrorNegocio } from "@/lib/server/errors";
import type { UsuarioSesion } from "@/lib/server/session";
import { nuevoCodigo } from "./codigos";

// ============================================================
//  Alcance: qué cursos puede ver/gestionar cada usuario
// ============================================================

/** `null` = todos los cursos (pastor/superadmin). */
export async function cursosEnAlcance(user: UsuarioSesion): Promise<string[] | null> {
  if (tieneRol(user.rol, R.ADMIN)) return null;
  const ids = new Set<string>();
  if (user.rol === "MAESTRO") {
    const a = await prisma.asignacionMaestro.findMany({ where: { fielId: user.fielId }, select: { cursoId: true } });
    a.forEach((x) => ids.add(x.cursoId));
  }
  if (user.rol === "SUPERVISOR") {
    const a = await prisma.asignacionSupervisor.findMany({
      where: { fielId: user.fielId, estado: "ACTIVO" },
      select: { cursoId: true },
    });
    a.forEach((x) => ids.add(x.cursoId));
  }
  return [...ids];
}

export function filtroCurso(alcance: string[] | null): Prisma.StringFilter | undefined {
  return alcance === null ? undefined : { in: alcance };
}

export async function exigirCursoEnAlcance(user: UsuarioSesion, cursoId: string) {
  const alcance = await cursosEnAlcance(user);
  if (alcance !== null && !alcance.includes(cursoId)) throw new ErrorNegocio("Este curso no está asignado a ti.");
}

// ============================================================
//  Inscripción académica (antes inscribirEstudianteDesdePago)
// ============================================================

export async function inscribirEnCurso(fielId: string, cursoId: string) {
  const existente = await prisma.matricula.findUnique({ where: { fielId_cursoId: { fielId, cursoId } } });
  if (existente) return { matricula: existente, yaInscrito: true };

  const [curso, fiel, maestro, supervisor] = await Promise.all([
    prisma.curso.findUniqueOrThrow({ where: { id: cursoId } }),
    prisma.fiel.findUniqueOrThrow({ where: { id: fielId } }),
    prisma.asignacionMaestro.findFirst({ where: { cursoId }, orderBy: [{ rol: "asc" }, { nivel: "asc" }] }),
    prisma.asignacionSupervisor.findFirst({ where: { cursoId, estado: "ACTIVO" } }),
  ]);

  const inicio = new Date();
  const vence = new Date(inicio);
  vence.setDate(vence.getDate() + (curso.duracionDias || ACADEMICO.DURACION_CURSO_DIAS));

  const matricula = await prisma.matricula.create({
    data: {
      codigo: nuevoCodigo("MAT"),
      fielId,
      cursoId,
      maestroId: maestro?.fielId,
      supervisorId: supervisor?.fielId,
      fechaInicio: inicio,
      fechaVencimiento: vence,
    },
  });

  if (fiel.correo) {
    await enviarCorreo({
      to: fiel.correo,
      tipo: "inscripcion",
      subject: `¡Inscripción confirmada! Curso: ${curso.nombre}`,
      html: plantillaCorreo(
        "¡Bienvenido al curso!",
        `<p>Hola <strong>${fiel.nombre}</strong>,</p>
         <p>Tu inscripción al curso <strong>${curso.nombre}</strong> ha sido confirmada.</p>
         <p><strong>Inicio:</strong> ${fecha(inicio)}<br/><strong>Vence:</strong> ${fecha(vence)} (${curso.duracionDias} días)</p>
         <p>Encuentras el contenido en <strong>"Mis cursos"</strong> del espacio de estudio.</p>`,
      ),
    });
  }
  return { matricula, yaInscrito: false };
}

// ============================================================
//  Recalcular progreso y nota final (antes recalcularControlAcademico)
// ============================================================

export async function recalcularMatricula(matriculaId: string) {
  const m = await prisma.matricula.findUniqueOrThrow({
    where: { id: matriculaId },
    include: {
      notas: { include: { actividad: true } },
      curso: { include: { actividades: { where: { tipo: { in: ["TAREA", "EXAMEN"] } } } } },
    },
  });

  const total = m.curso.actividades.length;
  let suma = 0;
  let pesos = 0;
  for (const n of m.notas) {
    const peso = n.actividad.peso || 100;
    const max = n.notaMax || n.actividad.notaMax || ACADEMICO.NOTA_MAX;
    suma += (n.nota / max) * ACADEMICO.NOTA_MAX * peso; // normaliza a escala 10
    pesos += peso;
  }
  const notaFinal = pesos > 0 ? Math.round((suma / pesos) * 10) / 10 : 0;
  const calificadas = m.notas.filter((n) => n.actividad.tipo === "TAREA" || n.actividad.tipo === "EXAMEN").length;
  const progreso = total > 0 ? Math.min(100, Math.round((calificadas / total) * 100)) : 0;

  let estado = m.estado;
  if (progreso === 100 && (estado === "EN_PROGRESO" || estado === "APROBADO" || estado === "REPROBADO")) {
    estado = notaFinal >= ACADEMICO.NOTA_MIN_APROBAR ? "APROBADO" : "REPROBADO";
  }

  return prisma.matricula.update({ where: { id: m.id }, data: { progreso, notaFinal, estado } });
}

/** Guarda (o reemplaza) la nota de una actividad y recalcula la matrícula. */
export async function registrarNota(args: {
  matriculaId: string;
  fielId: string;
  actividadId: string;
  nota: number;
  notaMax?: number;
  comentario?: string | null;
  entregaId?: string;
  intentoExamenId?: string;
}) {
  const { matriculaId, actividadId, ...rest } = args;
  await prisma.nota.upsert({
    where: { matriculaId_actividadId: { matriculaId, actividadId } },
    create: { matriculaId, actividadId, ...rest, notaMax: rest.notaMax ?? ACADEMICO.NOTA_MAX },
    update: { ...rest, notaMax: rest.notaMax ?? ACADEMICO.NOTA_MAX, fecha: new Date() },
  });
  return recalcularMatricula(matriculaId);
}

// ============================================================
//  Asistencia del estudiante (antes AsistenciaEstudianteModule)
// ============================================================

export async function asistenciaEstudiante(fielId: string, cursoId: string) {
  const sesiones = await prisma.sesionClase.findMany({
    where: { cursoId },
    orderBy: [{ fecha: "asc" }, { nivel: "asc" }],
    include: { asistencias: { where: { fielId }, select: { id: true } } },
  });
  const historial = sesiones.map((s) => ({
    fecha: s.fecha,
    nivel: s.nivel,
    tema: s.tema,
    asistio: s.asistencias.length > 0,
  }));
  const total = historial.length;
  const asistidas = historial.filter((h) => h.asistio).length;
  const porcentaje = total > 0 ? Math.round((asistidas / total) * 100) : 0;
  return {
    total,
    asistidas,
    falladas: total - asistidas,
    porcentaje,
    cumple: total === 0 || porcentaje >= ACADEMICO.ASISTENCIA_MIN_PCT,
    historial,
  };
}

/** % de asistencia para muchas matrículas de un curso en una sola consulta. */
export async function asistenciaPorFiel(cursoId: string) {
  const sesiones = await prisma.sesionClase.findMany({
    where: { cursoId },
    select: { asistencias: { select: { fielId: true } } },
  });
  const conteo = new Map<string, number>();
  sesiones.forEach((s) => s.asistencias.forEach((a) => conteo.set(a.fielId, (conteo.get(a.fielId) ?? 0) + 1)));
  const total = sesiones.length;
  return (fielId: string) => {
    const asistidas = conteo.get(fielId) ?? 0;
    return { total, asistidas, porcentaje: total > 0 ? Math.round((asistidas / total) * 100) : 0 };
  };
}

export function diasRestantes(vence: Date | null) {
  if (!vence) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000);
}
