import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Hand,
  Hourglass,
  Layers,
  Mail,
  PenLine,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";
import type { Actividad } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EstadoBadge, Nota, Panel } from "@/components/workspace/ui-kit";
import { ACADEMICO } from "@/lib/config";
import { ESTADO_ENTREGA, ESTADO_MATRICULA, fecha, fechaHora, TIPO_ACTIVIDAD } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/server/session";
import { asistenciaEstudiante, diasRestantes } from "@/server/academico";
import { describirHorario } from "@/lib/horario";
import { cn } from "@/lib/utils";
import { ContraerSidebar } from "@/components/workspace/contraer-sidebar";
import { CursoPortada, urlPortada } from "@/components/workspace/curso-portada";
import { Examen, SubirTarea } from "./interactivos";

const ICONO = { TAREA: FileText, EXAMEN: PenLine, MATERIAL: BookOpen, CLASE: CalendarCheck } as const;

function barajar<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function CursoEstudiantePage({
  params,
  searchParams,
}: {
  params: Promise<{ cursoId: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const user = await requirePage();
  const { cursoId } = await params;
  const { item = "bienvenida" } = await searchParams;

  const matricula = await prisma.matricula.findUnique({
    where: { fielId_cursoId: { fielId: user.fielId, cursoId } },
    include: {
      maestro: { select: { nombre: true, apellido: true, correo: true } },
      curso: {
        include: {
          actividades: { orderBy: [{ nivel: "asc" }, { orden: "asc" }, { createdAt: "asc" }] },
          maestros: { where: { rol: "TITULAR" }, take: 1, select: { fiel: { select: { nombre: true, apellido: true, correo: true } } } },
        },
      },
      notas: true,
      entregas: { orderBy: { fechaEntrega: "desc" } },
      intentos: { orderBy: { createdAt: "desc" } },
      certificados: true,
    },
  });
  if (!matricula) notFound();
  const { curso } = matricula;
  const niveles = [...new Set(curso.actividades.map((a) => a.nivel))];
  const notaDe = (actividadId: string) => matricula.notas.find((n) => n.actividadId === actividadId);
  const dias = diasRestantes(matricula.fechaVencimiento);
  const certificado = matricula.certificados.find((c) => c.estado === "EMITIDO");
  // El maestro asignado al matricularse (después del pago) o, si no hay, el titular del curso
  const maestro = matricula.maestro ?? curso.maestros[0]?.fiel ?? null;

  const href = (i: string) => `/workspace/mis-cursos/${cursoId}?item=${i}`;
  const linkClase = (activo: boolean) =>
    cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition", activo ? "bg-violet-600 text-white" : "hover:bg-accent");
  const enRevision = (actividadId: string) =>
    matricula.entregas.some((e) => e.actividadId === actividadId && e.estado === "ENVIADA");
  const evaluables = curso.actividades.filter((a) => a.tipo === "TAREA" || a.tipo === "EXAMEN");

  return (
    <>
      {/* Cabecera del curso: portada o degradado, con estado y progreso */}
      <CursoPortada portada={urlPortada(curso)} className={cn("rounded-2xl p-6", curso.imagenPath && "min-h-44")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{curso.nombre}</h1>
            <p className="mt-1 text-white/85">{curso.descripcion || "Comienza tu camino de aprendizaje."}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              {describirHorario(curso) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
                  <CalendarClock className="size-3.5" /> {describirHorario(curso)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
                <UserRound className="size-3.5" /> Maestro: {maestro ? `${maestro.nombre} ${maestro.apellido}` : "por asignar"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
                {curso.codigo} · Vence {fecha(matricula.fechaVencimiento)}
                {dias !== null && dias >= 0 && matricula.estado === "EN_PROGRESO" && ` (${dias} días)`}
              </span>
            </div>
          </div>
          <div className="w-full space-y-2 rounded-xl bg-white/15 p-3 backdrop-blur-sm sm:w-56">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/80">Estado</span>
              <EstadoBadge valor={matricula.estado} mapa={ESTADO_MATRICULA} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-white/80">Progreso</span>
                <span className="font-semibold tabular-nums">{matricula.progreso}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${matricula.progreso}%` }} />
              </div>
            </div>
          </div>
        </div>
      </CursoPortada>

      {/* Espacio de trabajo del curso: la barra principal se contrae para darle ancho */}
      <ContraerSidebar />
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav className="bg-card h-fit space-y-1 rounded-xl border p-2 shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Link href={href("bienvenida")} className={linkClase(item === "bienvenida")}>
            <Hand className="size-4" /> Bienvenida
          </Link>
          {niveles.map((nivel) => (
            <div key={nivel} className="pt-1">
              <Link href={href(`nivel-${nivel}`)} className={cn(linkClase(item === `nivel-${nivel}`), "font-semibold")}>
                <Layers className="size-4" /> Nivel {nivel}
              </Link>
              {curso.actividades
                .filter((a) => a.nivel === nivel)
                .map((a) => {
                  const Icon = ICONO[a.tipo];
                  const activo = item === a.id;
                  return (
                    <Link key={a.id} href={href(a.id)} className={cn(linkClase(activo), "pl-7")}>
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{a.nombre}</span>
                      {notaDe(a.id) ? (
                        <CheckCircle2 className={cn("size-4 shrink-0", activo ? "text-white" : "text-emerald-500")} />
                      ) : enRevision(a.id) ? (
                        <Hourglass className={cn("size-4 shrink-0", activo ? "text-white" : "text-blue-500")} />
                      ) : null}
                    </Link>
                  );
                })}
            </div>
          ))}
          <div className="border-t pt-1">
            <Link href={href("asistencia")} className={linkClase(item === "asistencia")}>
              <CalendarCheck className="size-4" /> Mi asistencia
            </Link>
            <Link href={href("final")} className={linkClase(item === "final")}>
              <Trophy className="size-4" /> Resultado final
            </Link>
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          <Contenido />
        </div>
      </div>
    </>
  );

  async function Contenido() {
    if (item === "bienvenida") {
      const tareas = curso.actividades.filter((a) => a.tipo === "TAREA").length;
      const examenes = curso.actividades.filter((a) => a.tipo === "EXAMEN").length;
      return (
        <>
          {maestro && (
            <Panel>
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                  {maestro.nombre[0]}
                  {maestro.apellido[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs uppercase">Tu maestro</p>
                  <p className="font-semibold">
                    {maestro.nombre} {maestro.apellido}
                  </p>
                </div>
                {maestro.correo && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${maestro.correo}`}>
                      <Mail /> Escribirle
                    </a>
                  </Button>
                )}
              </div>
            </Panel>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Resumen icon={Layers} valor={niveles.length} label="Niveles" />
            <Resumen icon={FileText} valor={tareas} label="Tareas" />
            <Resumen icon={PenLine} valor={examenes} label="Exámenes" />
          </div>
          <Panel title="Tu ruta en el curso">
            <ul className="divide-y">
              {niveles.map((nivel) => {
                const acts = evaluables.filter((a) => a.nivel === nivel);
                const hechas = acts.filter((a) => notaDe(a.id)).length;
                const pct = acts.length ? Math.round((hechas / acts.length) * 100) : 0;
                return (
                  <li key={nivel} className="flex items-center gap-4 py-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", pct === 100 ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700")}>
                      {pct === 100 ? <CheckCircle2 className="size-5" /> : nivel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Nivel {nivel}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="max-w-48" barClassName={pct === 100 ? "bg-emerald-500" : undefined} />
                        <span className="text-muted-foreground text-xs">{hechas}/{acts.length} calificadas</span>
                      </div>
                    </div>
                    <Button size="sm" variant={pct === 100 ? "outline" : "default"} asChild>
                      <Link href={href(`nivel-${nivel}`)}>{pct === 0 ? "Empezar" : pct === 100 ? "Repasar" : "Continuar"}</Link>
                    </Button>
                  </li>
                );
              })}
              {niveles.length === 0 && <p className="text-muted-foreground py-2 text-sm">Tu maestro aún no ha cargado actividades.</p>}
            </ul>
          </Panel>
          <Panel title="¿Cómo funciona?">
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>Avanza por los niveles del menú del curso, a la izquierda.</li>
              <li>Sube tus tareas en PDF; tu maestro las calificará.</li>
              <li>Los exámenes se califican automáticamente. Mínimo {ACADEMICO.NOTA_MIN_APROBAR}/10 para aprobar.</li>
              <li>Necesitas al menos {ACADEMICO.ASISTENCIA_MIN_PCT}% de asistencia a clases para certificarte.</li>
            </ul>
          </Panel>
        </>
      );
    }

    if (item.startsWith("nivel-")) {
      const nivel = Number(item.slice(6));
      const acts = curso.actividades.filter((a) => a.nivel === nivel);
      return (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-6 text-white">
            <h2 className="text-xl font-bold">Nivel {nivel}</h2>
            <p className="text-white/85">Completa estas actividades para avanzar.</p>
          </div>
          <Panel>
            <ul className="divide-y">
              {acts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {notaDe(a.id) ? <CheckCircle2 className="size-4 text-emerald-500" /> : (() => { const Icon = ICONO[a.tipo]; return <Icon className="text-muted-foreground size-4" />; })()}
                      <EstadoBadge valor={a.tipo} mapa={TIPO_ACTIVIDAD} />
                      <span className="font-medium">{a.nombre}</span>
                    </div>
                    {a.instrucciones && <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{a.instrucciones}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {enRevision(a.id) && <span className="text-xs text-blue-600">En revisión</span>}
                    <Nota valor={notaDe(a.id) ? (notaDe(a.id)!.nota / notaDe(a.id)!.notaMax) * 10 : null} />
                    <Button size="sm" variant="outline" asChild>
                      <Link href={href(a.id)}>Abrir</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      );
    }

    if (item === "asistencia") {
      const a = await asistenciaEstudiante(user.fielId, cursoId);
      return (
        <Panel title="Mi asistencia">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Resumen icon={CalendarCheck} valor={a.total} label="Clases" />
            <Resumen icon={CheckCircle2} valor={a.asistidas} label="Asistidas" />
            <Resumen icon={XCircle} valor={a.falladas} label="Faltas" />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Porcentaje de asistencia</span>
              <span className={cn("font-bold", a.cumple ? "text-emerald-600" : "text-red-600")}>{a.porcentaje}%</span>
            </div>
            <Progress value={a.porcentaje} barClassName={a.porcentaje >= ACADEMICO.ASISTENCIA_MIN_PCT ? "bg-emerald-500" : "bg-red-500"} />
            <p className={cn("mt-2 text-sm", a.cumple ? "text-emerald-700" : "text-red-700")}>
              {a.cumple ? "✓ Cumples" : "✗ No cumples"} el mínimo de {ACADEMICO.ASISTENCIA_MIN_PCT}%.
            </p>
          </div>
          <ul className="mt-4 space-y-1.5">
            {a.historial.map((h, i) => (
              <li key={i} className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {h.asistio ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-red-400" />}
                  {fecha(h.fecha)} · Nivel {h.nivel} {h.tema && <span className="text-muted-foreground">· {h.tema}</span>}
                </span>
                <span className={h.asistio ? "text-emerald-600" : "text-red-500"}>{h.asistio ? "Asistió" : "Faltó"}</span>
              </li>
            ))}
            {a.historial.length === 0 && <p className="text-muted-foreground text-sm">Aún no hay clases registradas.</p>}
          </ul>
        </Panel>
      );
    }

    if (item === "final") {
      return (
        <div className="space-y-5">
          <div className={cn("rounded-2xl bg-gradient-to-br p-6 text-center text-white", matricula!.estado === "APROBADO" ? "from-emerald-500 to-teal-500" : "from-slate-500 to-slate-700")}>
            <Trophy className="mx-auto mb-2 size-12" />
            <h2 className="text-2xl font-bold">{matricula!.estado === "APROBADO" ? "¡Completaste el curso!" : "Resultado del curso"}</h2>
            <p className="mt-1 text-white/85">
              Nota final: <strong>{matricula!.notaFinal}/10</strong> · Progreso {matricula!.progreso}%
            </p>
          </div>
          <Panel title="Certificado">
            {certificado?.pdfPath ? (
              <Button asChild>
                <a href={`/api/archivos/certificado/${certificado.id}?descargar`}>
                  <Download /> Descargar certificado
                </a>
              </Button>
            ) : certificado?.linkExterno ? (
              <Button asChild variant="outline">
                <a href={certificado.linkExterno} target="_blank" rel="noreferrer">
                  <ExternalLink /> Ver certificado
                </a>
              </Button>
            ) : matricula!.certificados.some((c) => c.estado === "EN_FIRMA") ? (
              <p className="flex items-center gap-2 text-sm">
                <Award className="size-4 text-amber-500" /> Tu certificado está en proceso de firmas.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Cuando tu maestro te apruebe, iniciará el proceso de certificación.</p>
            )}
          </Panel>
        </div>
      );
    }

    const actividad = curso.actividades.find((a) => a.id === item);
    if (!actividad) return <Panel>Selecciona un elemento del menú.</Panel>;
    return <DetalleActividad actividad={actividad} />;
  }

  async function DetalleActividad({ actividad }: { actividad: Actividad }) {
    const nota = notaDe(actividad.id);
    const material = (actividad.materialPath || actividad.linkMaterial) && (
      <div className="mt-4 flex flex-wrap gap-2">
        {actividad.materialPath && (
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/archivos/material/${actividad.id}`} target="_blank" rel="noreferrer">
              <FileText /> Material de apoyo
            </a>
          </Button>
        )}
        {actividad.linkMaterial && (
          <Button size="sm" variant="outline" asChild>
            <a href={actividad.linkMaterial} target="_blank" rel="noreferrer">
              <ExternalLink /> Enlace del material
            </a>
          </Button>
        )}
      </div>
    );

    const idx = curso.actividades.findIndex((a) => a.id === actividad.id);
    const anterior = curso.actividades[idx - 1];
    const siguiente = curso.actividades[idx + 1];
    const navegacion = (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {anterior ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(anterior.id)}>
              <ChevronLeft /> <span className="max-w-48 truncate">{anterior.nombre}</span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {siguiente ? (
          <Button size="sm" asChild>
            <Link href={href(siguiente.id)}>
              <span className="max-w-48 truncate">{siguiente.nombre}</span> <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href={href("final")}>
              Ver resultado final <Trophy />
            </Link>
          </Button>
        )}
      </div>
    );

    const encabezado = (
      <Panel>
        <Link href={href(`nivel-${actividad.nivel}`)} className="text-muted-foreground mb-2 flex items-center gap-1 text-xs hover:underline">
          <ChevronLeft className="size-3" /> Nivel {actividad.nivel}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <EstadoBadge valor={actividad.tipo} mapa={TIPO_ACTIVIDAD} />
            <h2 className="text-lg font-semibold">{actividad.nombre}</h2>
          </div>
          {nota && (
            <span className="text-sm">
              Nota: <Nota valor={(nota.nota / nota.notaMax) * 10} />
              /10
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
          {actividad.instrucciones || (actividad.tipo === "TAREA" ? "Realiza la tarea y súbela en formato PDF." : "")}
        </p>
        {material}
      </Panel>
    );

    if (actividad.tipo === "TAREA") {
      const entregas = matricula!.entregas.filter((e) => e.actividadId === actividad.id);
      return (
        <>
          {encabezado}
          <Panel title="Entregar tarea">
            <SubirTarea actividadId={actividad.id} />
          </Panel>
          <Panel title="Mis entregas">
            {entregas.length === 0 ? (
              <p className="text-muted-foreground text-sm">No has enviado esta tarea todavía.</p>
            ) : (
              <ul className="space-y-2">
                {entregas.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">Entregada {fechaHora(e.fechaEntrega)}</p>
                      {e.comentario && <p className="text-muted-foreground text-xs">Comentario: {e.comentario}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <EstadoBadge valor={e.estado} mapa={ESTADO_ENTREGA} />
                      {e.archivoPath && (
                        <a href={`/api/archivos/entrega/${e.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          Ver PDF
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {navegacion}
        </>
      );
    }

    if (actividad.tipo === "EXAMEN") {
      const preguntas = await prisma.pregunta.findMany({
        where: { cursoId: curso.id, nivel: actividad.nivel, OR: [{ actividadId: actividad.id }, { actividadId: null }] },
        select: { id: true, pregunta: true, puntos: true }, // sin la respuesta correcta
      });
      const intentos = matricula!.intentos.filter((i) => i.actividadId === actividad.id);
      return (
        <>
          {encabezado}
          <Panel title="Examen virtual">
            <Examen actividadId={actividad.id} preguntas={barajar(preguntas)} notaMinima={ACADEMICO.NOTA_MIN_APROBAR} />
          </Panel>
          <Panel title="Mis intentos">
            {intentos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aún no has presentado este examen.</p>
            ) : (
              <ul className="space-y-1.5">
                {intentos.map((i) => (
                  <li key={i.id} className="bg-muted/50 flex justify-between rounded-lg px-3 py-2 text-sm">
                    <span>{fechaHora(i.createdAt)}</span>
                    <span>
                      <Nota valor={i.notaManual ?? i.notaAutomatica} />
                      /10 · {i.puntosObtenidos}/{i.puntosTotal} pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {navegacion}
        </>
      );
    }

    return (
      <>
        {encabezado}
        {navegacion}
      </>
    );
  }
}

function Resumen({ icon: Icon, valor, label }: { icon: typeof Layers; valor: number; label: string }) {
  return (
    <div className="bg-card rounded-xl border p-4 text-center">
      <Icon className="mx-auto mb-1 size-5 text-violet-500" />
      <div className="text-2xl font-bold">{valor}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
