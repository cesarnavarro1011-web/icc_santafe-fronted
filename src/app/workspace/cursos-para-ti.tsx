import { CalendarDays, FileText, Layers, PenLine, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CursoPortada } from "@/components/workspace/curso-portada";
import { Panel } from "@/components/workspace/ui-kit";
import { dinero } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { cursosDisponibles } from "@/server/dashboards";
import { SolicitarButton } from "./solicitar-button";

const MAX_TARJETAS = 6;

/** Cursos que el estudiante aún no tiene, con los recomendados primero. */
export async function CursosParaTi({ fielId }: { fielId: string }) {
  const cursos = await cursosDisponibles(fielId);
  if (cursos.length === 0) return null;
  const visibles = cursos.slice(0, MAX_TARJETAS);
  const hayRecomendados = visibles.some((c) => c.motivo);

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-fuchsia-500" /> {hayRecomendados ? "Recomendados para ti" : "Sigue creciendo: cursos disponibles"}
        </span>
      }
      actions={cursos.length > MAX_TARJETAS && <span className="text-muted-foreground text-xs">{cursos.length} cursos disponibles</span>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibles.map((c) => (
          <article
            key={c.id}
            className={cn(
              "group flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-lg",
              c.motivo && "ring-2 ring-fuchsia-200",
            )}
          >
            <CursoPortada portada={c.portada} gradiente="from-indigo-500 via-violet-500 to-fuchsia-500" className="min-h-40 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">{c.codigo}</span>
                {c.motivo && (
                  <Badge className="border-transparent bg-white text-fuchsia-700">
                    <Sparkles /> {c.motivo}
                  </Badge>
                )}
              </div>
              <h3 className="mt-3 line-clamp-1 text-lg font-bold">{c.nombre}</h3>
              <p className="mt-1 line-clamp-2 min-h-8 text-xs text-white/85">
                {c.descripcion || "Profundiza en tu fe y fortalece tu servicio con este curso."}
              </p>
            </CursoPortada>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <ul className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                <li className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-violet-500" /> {Math.max(c.niveles, 1)} {Math.max(c.niveles, 1) === 1 ? "nivel" : "niveles"}
                </li>
                <li className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-violet-500" /> {c.duracionDias} días
                </li>
                <li className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-violet-500" /> {c.tareas} tareas
                </li>
                <li className="flex items-center gap-1.5">
                  <PenLine className="size-3.5 text-violet-500" /> {c.examenes} exámenes
                </li>
              </ul>
              {c.estudiantes > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <Users className="size-3.5" /> {c.estudiantes} {c.estudiantes === 1 ? "persona lo está cursando" : "personas lo están cursando"}
                </p>
              )}
              <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Inversión</span>
                  <span className="text-lg font-bold">{c.costo > 0 ? dinero(c.costo) : "Gratis"}</span>
                </div>
              </div>
              <SolicitarButton cursoId={c.id} nombre={c.nombre} solicitado={c.solicitado} gratis={c.costo === 0} />
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
