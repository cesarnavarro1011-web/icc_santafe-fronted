import { CalendarClock, ClipboardList } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { describirHorario } from "@/lib/horario";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";
import { hoyISO } from "@/server/turnos";
import { FiltrosAsistencia } from "./filtros";
import { TablaAsistencia } from "./tabla-asistencia";

export default async function AsistenciaCursosPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; nivel?: string; mes?: string }>;
}) {
  const user = await requirePage(R.ACADEMICO);
  const params = await searchParams;
  const alcance = await cursosEnAlcance(user);
  const registra = tieneRol(user.rol, R.REGISTRA_CLASES);

  const cursos = await prisma.curso.findMany({
    where: { id: filtroCurso(alcance), estado: "ACTIVO" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, codigo: true, diasClase: true, horaInicio: true, horaFin: true, actividades: { select: { nivel: true } } },
  });

  if (cursos.length === 0) {
    return (
      <>
        <PageHeader title="Asistencia de cursos" />
        <Panel>
          <EmptyState icon={ClipboardList}>No tienes cursos asignados.</EmptyState>
        </Panel>
      </>
    );
  }

  const curso = cursos.find((c) => c.id === params.curso) ?? cursos[0];
  const niveles = [...new Set([1, ...curso.actividades.map((a) => a.nivel)])].sort((a, b) => a - b);
  const nivel = niveles.includes(Number(params.nivel)) ? Number(params.nivel) : niveles[0];

  const hoy = hoyISO();
  const mes = params.mes && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : hoy.slice(0, 7);
  const [anio, m] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(anio, m - 1, 1));
  const hasta = new Date(Date.UTC(anio, m, 1));
  const ultimoDia = new Date(hasta.getTime() - 86_400_000).toISOString().slice(0, 10);
  const mesLabel = new Date(anio, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const [sesiones, matriculas] = await Promise.all([
    prisma.sesionClase.findMany({
      where: { cursoId: curso.id, nivel, fecha: { gte: desde, lt: hasta } },
      include: { asistencias: { select: { fielId: true } } },
    }),
    prisma.matricula.findMany({
      where: { cursoId: curso.id, estado: { in: ["EN_PROGRESO", "APROBADO"] } },
      include: { fiel: { select: { nombre: true, apellido: true } } },
      orderBy: [{ fiel: { apellido: "asc" } }, { fiel: { nombre: "asc" } }],
    }),
  ]);

  // Columnas: días del mes que caen en el horario + clases ya registradas fuera de él
  const programadas = new Set<string>();
  for (let d = new Date(desde); d < hasta; d = new Date(d.getTime() + 86_400_000)) {
    if (curso.diasClase.includes(d.getUTCDay())) programadas.add(d.toISOString().slice(0, 10));
  }
  const registradas = sesiones.map((s) => s.fecha.toISOString().slice(0, 10));
  const fechas = [...new Set([...programadas, ...registradas])].sort().map((iso) => ({ iso, programada: programadas.has(iso) }));
  const marcadas = sesiones.flatMap((s) => s.asistencias.map((a) => `${s.fecha.toISOString().slice(0, 10)}|${a.fielId}`));
  const horario = describirHorario(curso);

  return (
    <>
      <PageHeader
        title="Asistencia de cursos"
        description={registra ? "Marca la asistencia de tus alumnos en cada fecha de clase" : "Consulta de la asistencia de los alumnos · solo lectura"}
      />
      <FiltrosAsistencia
        cursos={cursos.map((c) => ({ value: c.id, label: `${c.nombre} (${c.codigo})` }))}
        curso={curso.id}
        niveles={niveles}
        nivel={nivel}
        mes={mes}
        mesLabel={mesLabel}
      />

      <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4 shadow-sm">
        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
          <CalendarClock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase">Horario de clases</p>
          <p className="font-medium">{horario ?? <span className="text-amber-600">Sin horario definido</span>}</p>
        </div>
        {!horario && (
          <span className="text-muted-foreground text-xs">
            {tieneRol(user.rol, R.ADMIN) ? "Defínelo al editar el curso en el Catálogo." : "El pastor lo define en el Catálogo de cursos."}
          </span>
        )}
      </div>

      <Panel title={`Alumnos inscritos · ${matriculas.length}`}>
        <TablaAsistencia
          key={`${curso.id}-${nivel}-${mes}`}
          cursoId={curso.id}
          nivel={nivel}
          fechas={fechas}
          estudiantes={matriculas.map((mt) => ({ fielId: mt.fielId, nombre: `${mt.fiel.apellido} ${mt.fiel.nombre}` }))}
          marcadas={marcadas}
          hoy={hoy}
          soloLectura={!registra}
          min={desde.toISOString().slice(0, 10)}
          max={ultimoDia < hoy ? ultimoDia : hoy}
        />
      </Panel>
    </>
  );
}
