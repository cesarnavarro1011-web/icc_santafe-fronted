import "server-only";
import { urlPortada } from "@/components/workspace/curso-portada";
import { prisma } from "@/lib/prisma";
import { ACADEMICO } from "@/lib/config";
import type { UsuarioSesion } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "./academico";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function dashboardGeneral() {
  const [totalFieles, fielesActivos, enCurso, aprobados, certificados, tareasPendientes, asistenciasHoy, pagos] =
    await Promise.all([
      prisma.fiel.count(),
      prisma.fiel.count({ where: { estado: "ACTIVO" } }),
      prisma.matricula.count({ where: { estado: "EN_PROGRESO" } }),
      prisma.matricula.count({ where: { estado: "APROBADO" } }),
      prisma.certificado.count({ where: { estado: "EMITIDO" } }),
      prisma.entrega.count({ where: { estado: "ENVIADA" } }),
      prisma.asistenciaCongregacional.count({ where: { fecha: { gte: inicioDeHoy() } } }),
      prisma.inscripcion.aggregate({ _sum: { montoPagado: true } }),
    ]);
  return {
    totalFieles,
    fielesActivos,
    enCurso,
    aprobados,
    certificados,
    tareasPendientes,
    asistenciasHoy,
    ingresos: Number(pagos._sum.montoPagado ?? 0),
  };
}

export async function dashboardLider() {
  const hace30 = new Date(Date.now() - 30 * 86_400_000);
  const [fielesActivos, bautizados, asistenciasHoy, asistencias30, invitados30] = await Promise.all([
    prisma.fiel.count({ where: { estado: "ACTIVO" } }),
    prisma.fiel.count({ where: { bautizado: true, estado: "ACTIVO" } }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: inicioDeHoy() } } }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: hace30 } } }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: hace30 }, fielId: null } }),
  ]);
  return { fielesActivos, bautizados, asistenciasHoy, asistencias30, invitados30 };
}

export async function dashboardSupervisor(user: UsuarioSesion) {
  const alcance = await cursosEnAlcance(user);
  const cursoId = filtroCurso(alcance);
  const [cursos, estudiantes, certsPendientes, alertas] = await Promise.all([
    alcance === null ? prisma.curso.count({ where: { estado: "ACTIVO" } }) : Promise.resolve(alcance.length),
    prisma.matricula.count({ where: { cursoId, estado: "EN_PROGRESO" } }),
    prisma.certificado.count({ where: { cursoId, estado: "EN_FIRMA", firmaSupervisorAt: null } }),
    alertasIntegridad(alcance),
  ]);
  return { cursos, estudiantes, certsPendientes, alertas };
}

/** Irregularidades: tareas aprobadas con nota menor al mínimo (antes getDashboardLider). */
export async function alertasIntegridad(alcance: string[] | null) {
  const notas = await prisma.nota.findMany({
    where: {
      nota: { lt: ACADEMICO.NOTA_MIN_APROBAR },
      entrega: { estado: "APROBADA" },
      matricula: { cursoId: filtroCurso(alcance) },
    },
    include: { fiel: true, actividad: { include: { curso: true } } },
    take: 50,
  });
  return notas.map((n) => ({
    id: n.id,
    tipo: "Tarea aprobada con nota baja",
    fiel: `${n.fiel.nombre} ${n.fiel.apellido}`,
    curso: n.actividad.curso.nombre,
    detalle: `${n.actividad.nombre}: nota ${n.nota} (mínimo ${ACADEMICO.NOTA_MIN_APROBAR})`,
  }));
}

export async function dashboardMaestro(user: UsuarioSesion) {
  const alcance = (await cursosEnAlcance(user)) ?? [];
  const [estudiantes, pendientes, calificadas, examenes] = await Promise.all([
    prisma.matricula.findMany({ where: { cursoId: { in: alcance } }, distinct: ["fielId"], select: { fielId: true } }),
    prisma.entrega.count({ where: { estado: "ENVIADA", actividad: { cursoId: { in: alcance } } } }),
    prisma.entrega.count({ where: { estado: { in: ["APROBADA", "REPROBADA"] }, actividad: { cursoId: { in: alcance } } } }),
    prisma.intentoExamen.count({ where: { actividad: { cursoId: { in: alcance } } } }),
  ]);
  return { cursos: alcance.length, estudiantes: estudiantes.length, pendientes, calificadas, examenes };
}

/** Tablero del estudiante: lo que tiene pendiente, sus notas y novedades de sus cursos. */
export async function tableroEstudiante(fielId: string) {
  const matriculas = await prisma.matricula.findMany({
    where: { fielId },
    orderBy: { fechaInicio: "desc" },
    include: {
      curso: {
        include: {
          actividades: {
            where: { tipo: { in: ["TAREA", "EXAMEN"] } },
            orderBy: [{ nivel: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      notas: { select: { actividadId: true } },
      entregas: { select: { actividadId: true, estado: true } },
    },
  });

  const activas = matriculas.filter((m) => m.estado === "EN_PROGRESO");
  const hoy = Date.now();

  // Siguiente actividad sin calificar ni entregada (pendiente de revisión) por curso activo
  const continuar = activas.map((m) => {
    const calificadas = new Set(m.notas.map((n) => n.actividadId));
    const enRevision = new Set(m.entregas.filter((e) => e.estado === "ENVIADA").map((e) => e.actividadId));
    const pendientes = m.curso.actividades.filter((a) => !calificadas.has(a.id) && !enRevision.has(a.id));
    return {
      matricula: m,
      siguiente: pendientes[0] ?? null,
      pendientes: pendientes.length,
      enRevision: enRevision.size,
      vencePronto: m.fechaVencimiento ? (m.fechaVencimiento.getTime() - hoy) / 86_400_000 : null,
    };
  });

  const [ultimasNotas, novedades, certificados] = await Promise.all([
    prisma.nota.findMany({
      where: { fielId },
      orderBy: { fecha: "desc" },
      take: 6,
      include: { actividad: { include: { curso: { select: { nombre: true, id: true } } } } },
    }),
    prisma.entrega.findMany({
      where: { fielId, estado: { not: "ENVIADA" }, revisadoAt: { not: null } },
      orderBy: { revisadoAt: "desc" },
      take: 5,
      include: { actividad: { include: { curso: { select: { nombre: true, id: true } } } } },
    }),
    prisma.certificado.findMany({ where: { fielId, estado: "EMITIDO" }, include: { curso: true } }),
  ]);

  const conNota = matriculas.filter((m) => m.notaFinal > 0);
  return {
    matriculas,
    continuar,
    ultimasNotas,
    novedades,
    certificados,
    stats: {
      activos: activas.length,
      aprobados: matriculas.filter((m) => m.estado === "APROBADO").length,
      promedio: conNota.length ? Math.round((conNota.reduce((s, m) => s + m.notaFinal, 0) / conNota.length) * 10) / 10 : null,
      pendientes: continuar.reduce((s, c) => s + c.pendientes, 0),
      enRevision: continuar.reduce((s, c) => s + c.enRevision, 0),
      totalActividades: activas.reduce((s, m) => s + m.curso.actividades.length, 0),
      progresoPromedio: activas.length ? Math.round(activas.reduce((s, m) => s + m.progreso, 0) / activas.length) : 0,
    },
  };
}

/** "TEOL-2" → { serie: "TEOL", numero: 2 } */
function serieDe(codigo: string) {
  const m = codigo.match(/^(.*?)[-_ ]?(\d+)$/);
  return m ? { serie: m[1].toUpperCase(), numero: Number(m[2]) } : null;
}

/**
 * Cursos activos que el fiel todavía no tiene, con los recomendados primero:
 *  1. el siguiente de una serie que ya cursa o aprobó (TEOL-1 → TEOL-2)
 *  2. el siguiente nivel del programa (Curso.nivel)
 *  3. si aún no tiene cursos, los de nivel 1 / primeros de cada serie
 */
export async function cursosDisponibles(fielId: string) {
  const [matriculas, solicitudes, cursos] = await Promise.all([
    prisma.matricula.findMany({ where: { fielId }, include: { curso: { select: { codigo: true, nivel: true } } } }),
    prisma.inscripcion.findMany({
      where: { fielId, estadoPago: { in: ["PENDIENTE", "ABONO"] } },
      select: { cursoId: true },
    }),
    prisma.curso.findMany({
      where: { estado: "ACTIVO", matriculas: { none: { fielId } } },
      orderBy: [{ nivel: "asc" }, { nombre: "asc" }],
      include: {
        _count: { select: { matriculas: true } },
        actividades: { select: { nivel: true, tipo: true } },
      },
    }),
  ]);

  const siguienteEnSerie = new Map<string, number>();
  for (const m of matriculas) {
    const s = serieDe(m.curso.codigo);
    if (s) siguienteEnSerie.set(s.serie, Math.max(siguienteEnSerie.get(s.serie) ?? 0, s.numero + 1));
  }
  const nivelAprobado = Math.max(0, ...matriculas.filter((m) => m.estado === "APROBADO").map((m) => m.curso.nivel ?? 0));
  const sinCursos = matriculas.length === 0;
  const enSolicitud = new Set(solicitudes.map((s) => s.cursoId));

  const lista = cursos.map((c) => {
    const s = serieDe(c.codigo);
    let motivo: string | null = null;
    if (s && siguienteEnSerie.get(s.serie) === s.numero) motivo = "Continúa tu formación";
    else if (nivelAprobado > 0 && c.nivel === nivelAprobado + 1) motivo = "Tu siguiente nivel";
    else if (sinCursos && ((c.nivel ?? 1) === 1 || s?.numero === 1)) motivo = "Ideal para empezar";
    return {
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion,
      portada: urlPortada(c),
      duracionDias: c.duracionDias,
      costo: Number(c.costo),
      estudiantes: c._count.matriculas,
      niveles: new Set(c.actividades.map((a) => a.nivel)).size,
      tareas: c.actividades.filter((a) => a.tipo === "TAREA").length,
      examenes: c.actividades.filter((a) => a.tipo === "EXAMEN").length,
      motivo,
      solicitado: enSolicitud.has(c.id),
    };
  });
  return lista.sort((a, b) => Number(!!b.motivo) - Number(!!a.motivo));
}

/** Cursos del usuario para la barra lateral (serializable). */
export async function cursosParaMenu(fielId: string) {
  const matriculas = await prisma.matricula.findMany({
    where: { fielId, estado: { not: "RETIRADO" } },
    orderBy: [{ estado: "asc" }, { fechaInicio: "desc" }],
    include: { curso: { include: { actividades: { select: { id: true, nivel: true } } } } },
  });
  return matriculas.map((m) => ({
    id: m.cursoId,
    nombre: m.curso.nombre,
    codigo: m.curso.codigo,
    progreso: m.progreso,
    aprobado: m.estado === "APROBADO",
    niveles: [...new Set(m.curso.actividades.map((a) => a.nivel))].sort((a, b) => a - b),
    actividades: m.curso.actividades.map((a) => ({ id: a.id, nivel: a.nivel })),
  }));
}

export type CursoMenu = Awaited<ReturnType<typeof cursosParaMenu>>[number];
