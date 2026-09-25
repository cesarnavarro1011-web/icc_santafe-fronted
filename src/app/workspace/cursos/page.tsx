import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CursoPortada, urlPortada } from "@/components/workspace/curso-portada";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, EstadoBadge, PageHeader } from "@/components/workspace/ui-kit";
import { describirHorario } from "@/lib/horario";
import { dinero, ESTADO_REGISTRO } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { guardarCurso } from "./actions";
import { CursoFields } from "./curso-form";

export default async function CursosPage() {
  await requirePage(R.ADMIN);
  const cursos = await prisma.curso.findMany({
    orderBy: [{ estado: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { actividades: true, matriculas: true } } },
  });

  return (
    <>
      <PageHeader
        title="Catálogo de cursos"
        description={`${cursos.length} cursos`}
        actions={
          <FormDialog
            title="Nuevo curso"
            action={guardarCurso.bind(null, null)}
            successMessage="Curso creado"
            trigger={
              <Button>
                <Plus /> Nuevo curso
              </Button>
            }
          >
            <CursoFields />
          </FormDialog>
        }
      />
      {cursos.length === 0 ? (
        <EmptyState icon={BookOpen}>Aún no hay cursos. Crea el primero.</EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cursos.map((c) => (
            <Link
              key={c.id}
              href={`/workspace/cursos/${c.id}`}
              className="group bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md"
            >
              <CursoPortada portada={urlPortada(c)} className="min-h-36 p-5">
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">{c.codigo}</span>
                <h3 className="mt-2 line-clamp-1 text-lg font-bold">{c.nombre}</h3>
                <p className="mt-1 line-clamp-2 h-8 text-xs text-white/80">{c.descripcion || "Sin descripción."}</p>
                <p className="mt-2 text-[11px] text-white/85">{describirHorario(c) ?? "Sin horario · defínelo al editar el curso"}</p>
                {!c.imagenPath && <p className="text-[10px] text-white/70">Sin portada · agrégala al editar el curso</p>}
              </CursoPortada>
              <div className="flex flex-1 flex-wrap items-center gap-2 p-4 text-xs">
                <EstadoBadge valor={c.estado} mapa={ESTADO_REGISTRO} />
                <span className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <Layers className="size-3" /> {c._count.actividades} actividades
                </span>
                <span className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <Users className="size-3" /> {c._count.matriculas} estudiantes
                </span>
              </div>
              <div className="bg-muted/40 flex items-center justify-between border-t px-4 py-3 text-xs">
                <span>
                  <span className="text-muted-foreground block text-[10px] uppercase">Inversión</span>
                  <strong>{Number(c.costo) > 0 ? dinero(c.costo) : "Beca / gratis"}</strong>
                </span>
                <span className="flex items-center gap-1 font-semibold text-violet-700 group-hover:translate-x-1 transition-transform">
                  Gestionar <ArrowRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
