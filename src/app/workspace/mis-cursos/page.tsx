import Link from "next/link";
import { BookOpen, CalendarCheck, ChevronRight, GraduationCap, Hourglass, ListChecks, Skull, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CursoPortada, urlPortada } from "@/components/workspace/curso-portada";
import { EmptyState, PageHeader } from "@/components/workspace/ui-kit";
import { ACADEMICO } from "@/lib/config";
import { fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/server/session";
import { asistenciaEstudiante, diasRestantes } from "@/server/academico";
import { cn } from "@/lib/utils";

export default async function MisCursosPage() {
  const user = await requirePage();
  const matriculas = await prisma.matricula.findMany({
    where: { fielId: user.fielId },
    include: {
      maestro: { select: { nombre: true, apellido: true, correo: true } },
      curso: {
        include: {
          _count: { select: { actividades: true } },
          maestros: { where: { rol: "TITULAR" }, take: 1, select: { fiel: { select: { nombre: true, apellido: true, correo: true } } } },
        },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });
  const asistencias = await Promise.all(matriculas.map((m) => asistenciaEstudiante(user.fielId, m.cursoId)));

  return (
    <>
      <PageHeader title="Mis cursos" description={`${matriculas.length} cursos inscritos`} />
      {matriculas.length === 0 ? (
        <EmptyState icon={BookOpen}>No tienes cursos inscritos aún. Habla con tu pastor para inscribirte.</EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {matriculas.map((m, i) => {
            const dias = diasRestantes(m.fechaVencimiento);
            const vencido = m.estado === "EN_PROGRESO" && dias !== null && dias < 0;
            const asist = asistencias[i];
            return (
              <Link
                key={m.id}
                href={`/workspace/mis-cursos/${m.cursoId}`}
                className={cn("group bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-lg", vencido && "border-red-200")}
              >
                <CursoPortada portada={urlPortada(m.curso)} gradiente={vencido ? "from-red-500 to-rose-500" : "from-violet-500 to-fuchsia-500"} className="min-h-36 p-5">
                  <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">{m.curso.codigo}</span>
                  <h3 className="mt-2 line-clamp-1 text-lg font-bold">{m.curso.nombre}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-white/80">{m.curso.descripcion || "Sin descripción"}</p>
                </CursoPortada>
                <div className="flex-1 space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    {vencido ? (
                      <Badge variant="danger"><Skull /> Vencido</Badge>
                    ) : m.estado === "APROBADO" ? (
                      <Badge variant="success"><GraduationCap /> Aprobado</Badge>
                    ) : dias !== null && dias <= 7 && m.estado === "EN_PROGRESO" ? (
                      <Badge variant="warning"><Hourglass /> {dias} días restantes</Badge>
                    ) : (
                      <Badge variant="violet"><BookOpen /> {m.estado === "REPROBADO" ? "Reprobado" : "En curso"}</Badge>
                    )}
                    <div className="text-right text-xs">
                      <p className={cn("font-semibold", m.notaFinal >= ACADEMICO.NOTA_MIN_APROBAR ? "text-emerald-600" : m.notaFinal > 0 ? "text-red-500" : "text-muted-foreground")}>
                        {m.notaFinal > 0 ? `Nota: ${m.notaFinal}/10` : "Sin calificar"}
                      </p>
                      {m.fechaVencimiento && <p className="text-muted-foreground">{vencido ? "Venció" : "Vence"}: {fecha(m.fechaVencimiento)}</p>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-semibold">{m.progreso}%</span>
                    </div>
                    <Progress value={m.progreso} barClassName={m.progreso >= 70 ? "bg-emerald-500" : m.progreso >= 30 ? "bg-amber-500" : "bg-violet-500"} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center text-xs">
                    <div className="bg-muted/60 rounded-lg p-2">
                      <CalendarCheck className="mx-auto size-4 text-violet-500" />
                      <p className={cn("mt-0.5", asist.cumple ? "text-emerald-600" : "font-semibold text-red-500")}>
                        {asist.total ? `${asist.porcentaje}% asistencia` : "Sin clases aún"}
                      </p>
                    </div>
                    <div className="bg-muted/60 rounded-lg p-2">
                      <ListChecks className="mx-auto size-4 text-violet-500" />
                      <p className="mt-0.5">{m.curso._count.actividades} actividades</p>
                    </div>
                  </div>
                  {(() => {
                    const maestro = m.maestro ?? m.curso.maestros[0]?.fiel;
                    return (
                      <p className="flex items-center gap-1.5 text-xs">
                        <UserRound className="size-3.5 text-violet-500" />
                        <span className="text-muted-foreground">Tu maestro:</span>
                        <span className="font-medium">{maestro ? `${maestro.nombre} ${maestro.apellido}` : "por asignar"}</span>
                      </p>
                    );
                  })()}
                </div>
                <div className="bg-muted/40 flex items-center justify-center gap-1 border-t p-3 text-xs font-semibold text-violet-700">
                  Entrar al curso <ChevronRight className="size-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
