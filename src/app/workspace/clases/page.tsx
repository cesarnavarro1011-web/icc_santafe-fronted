import Link from "next/link";
import { ArrowRight, Inbox, Presentation, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/workspace/ui-kit";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";

export default async function ClasesPage() {
  const user = await requirePage(R.ACADEMICO);
  const alcance = await cursosEnAlcance(user);
  const cursos = await prisma.curso.findMany({
    where: { id: filtroCurso(alcance), estado: "ACTIVO" },
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { matriculas: { where: { estado: "EN_PROGRESO" } } } },
      actividades: { select: { _count: { select: { entregas: { where: { estado: "ENVIADA" } } } } } },
    },
  });

  return (
    <>
      <PageHeader title="Mis clases" description="Cursos que enseñas o supervisas" />
      {cursos.length === 0 ? (
        <EmptyState icon={Presentation}>No tienes cursos asignados. El pastor los asigna en “Maestros y supervisores”.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cursos.map((c) => {
            const pendientes = c.actividades.reduce((s, a) => s + a._count.entregas, 0);
            return (
              <Link key={c.id} href={`/workspace/clases/${c.id}`} className="bg-card group rounded-xl border p-5 shadow-sm transition hover:shadow-md">
                <span className="text-muted-foreground font-mono text-xs">{c.codigo}</span>
                <h3 className="mt-1 text-lg font-semibold">{c.nombre}</h3>
                <div className="text-muted-foreground mt-3 flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="size-4" /> {c._count.matriculas} activos
                  </span>
                  <span className="flex items-center gap-1">
                    <Inbox className="size-4" /> {pendientes} por revisar
                  </span>
                </div>
                <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-violet-700 transition-transform group-hover:translate-x-1">
                  Ver estudiantes <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
