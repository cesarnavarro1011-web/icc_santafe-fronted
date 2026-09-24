import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  Download,
  FileText,
  GraduationCap,
  Hourglass,
  MessageSquare,
  PenLine,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EstadoBadge, KpiCard, Nota, Panel } from "@/components/workspace/ui-kit";
import { ESTADO_ENTREGA, fecha, fechaHora, TIPO_ACTIVIDAD } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { tableroEstudiante } from "@/server/dashboards";
import { CursosParaTi } from "./cursos-para-ti";

/** Inicio del estudiante: qué sigue en cada curso, notas recientes y novedades. */
export async function TableroEstudiante({ fielId, compacto = false }: { fielId: string; compacto?: boolean }) {
  const t = await tableroEstudiante(fielId);
  if (t.matriculas.length === 0) {
    if (compacto) return null;
    return (
      <>
        <Panel>
          <div className="py-8 text-center">
            <BookOpen className="mx-auto mb-3 size-12 text-violet-300" />
            <h2 className="text-lg font-semibold">Comienza tu formación</h2>
            <p className="text-muted-foreground text-sm">
              Elige un curso abajo y envía tu solicitud. Cuando quedes inscrito, aparecerá en el menú de la izquierda.
            </p>
          </div>
        </Panel>
        <CursosParaTi fielId={fielId} />
      </>
    );
  }

  const urlCurso = (cursoId: string, item?: string) => `/workspace/mis-cursos/${cursoId}${item ? `?item=${item}` : ""}`;
  const porVencer = t.continuar.filter((c) => c.vencePronto !== null && c.vencePronto <= 30);

  return (
    <>
      {compacto ? (
        <h2 className="mt-2 text-lg font-semibold">Mi estudio</h2>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={BookOpen} label="Cursos en progreso" value={t.stats.activos} color="violet" sub={`${t.stats.aprobados} aprobados`} />
          <KpiCard icon={Star} label="Promedio general" value={t.stats.promedio ?? "—"} color="green" sub="sobre 10" />
          <KpiCard icon={PenLine} label="Actividades pendientes" value={t.stats.pendientes} color="amber" />
          <KpiCard icon={Hourglass} label="En revisión" value={t.stats.enRevision} color="blue" sub="tareas enviadas al maestro" />
        </div>
      )}

      {t.continuar.length > 0 && (
        <Panel title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-violet-500" /> Continúa donde quedaste</span>}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {t.continuar.map(({ matricula: m, siguiente, pendientes }) => (
              <div key={m.id} className="flex flex-col rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-muted-foreground font-mono text-[10px] uppercase">{m.curso.codigo}</p>
                    <h3 className="truncate font-semibold">{m.curso.nombre}</h3>
                  </div>
                  <span className="text-sm font-bold text-violet-700">{m.progreso}%</span>
                </div>
                <Progress value={m.progreso} className="my-3" />
                {siguiente ? (
                  <div className="bg-muted/50 mb-3 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground text-xs">Siguiente · Nivel {siguiente.nivel}</p>
                    <p className="flex items-center gap-2 font-medium">
                      {siguiente.tipo === "EXAMEN" ? <PenLine className="size-4" /> : <FileText className="size-4" />}
                      <span className="truncate">{siguiente.nombre}</span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {pendientes} {pendientes === 1 ? "actividad pendiente" : "actividades pendientes"}
                    </p>
                  </div>
                ) : (
                  <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">¡Estás al día! Espera la revisión de tu maestro.</p>
                )}
                <Button asChild size="sm" className="mt-auto">
                  <Link href={urlCurso(m.cursoId, siguiente?.id)}>
                    {siguiente ? (siguiente.tipo === "EXAMEN" ? "Presentar examen" : "Ir a la tarea") : "Entrar al curso"} <ArrowRight />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {!compacto && <CursosParaTi fielId={fielId} />}

      {!compacto && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={<span className="flex items-center gap-2"><Star className="size-4 text-amber-500" /> Mis últimas calificaciones</span>}>
            {t.ultimasNotas.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aún no tienes calificaciones.</p>
            ) : (
              <ul className="divide-y">
                {t.ultimasNotas.map((n) => (
                  <li key={n.id}>
                    <Link href={urlCurso(n.actividad.curso.id, n.actividadId)} className="hover:bg-accent -mx-2 flex items-center justify-between gap-3 rounded px-2 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <EstadoBadge valor={n.actividad.tipo} mapa={TIPO_ACTIVIDAD} />
                          <span className="truncate text-sm font-medium">{n.actividad.nombre}</span>
                        </div>
                        <p className="text-muted-foreground text-xs">{n.actividad.curso.nombre} · {fecha(n.fecha)}</p>
                      </div>
                      <span className="text-lg">
                        <Nota valor={(n.nota / n.notaMax) * 10} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="space-y-5">
            <Panel title={<span className="flex items-center gap-2"><MessageSquare className="size-4 text-blue-500" /> Revisiones de tu maestro</span>}>
              {t.novedades.length === 0 ? (
                <p className="text-muted-foreground text-sm">Cuando tu maestro revise una tarea, lo verás aquí.</p>
              ) : (
                <ul className="space-y-2">
                  {t.novedades.map((e) => (
                    <li key={e.id}>
                      <Link href={urlCurso(e.actividad.curso.id, e.actividadId)} className="hover:bg-accent block rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{e.actividad.nombre}</span>
                          <EstadoBadge valor={e.estado} mapa={ESTADO_ENTREGA} />
                        </div>
                        {e.comentario && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">“{e.comentario}”</p>}
                        <p className="text-muted-foreground mt-1 text-[10px]">{fechaHora(e.revisadoAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {porVencer.length > 0 && (
              <Panel title={<span className="flex items-center gap-2"><CalendarClock className="size-4 text-red-500" /> Próximos vencimientos</span>}>
                <ul className="space-y-2">
                  {porVencer.map(({ matricula: m, vencePronto }) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{m.curso.nombre}</span>
                      <span className={cn("text-xs font-semibold", vencePronto! < 0 ? "text-red-600" : vencePronto! <= 7 ? "text-amber-600" : "text-muted-foreground")}>
                        {vencePronto! < 0 ? "Vencido" : `${Math.ceil(vencePronto!)} días · ${fecha(m.fechaVencimiento)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {t.certificados.length > 0 && (
              <Panel title={<span className="flex items-center gap-2"><Award className="size-4 text-emerald-500" /> Mis certificados</span>}>
                <ul className="space-y-2">
                  {t.certificados.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="size-4 text-emerald-600" /> {c.curso.nombre}
                      </span>
                      {c.pdfPath && (
                        <Button size="icon-sm" variant="outline" asChild aria-label="Descargar">
                          <a href={`/api/archivos/certificado/${c.id}?descargar`}>
                            <Download />
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}
    </>
  );
}
