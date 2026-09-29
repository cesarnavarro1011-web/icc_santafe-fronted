import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, Layers, PenLine } from "lucide-react";
import { CursoPortada, urlPortada } from "@/components/workspace/curso-portada";
import { Panel } from "@/components/workspace/ui-kit";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/server/session";
import { simulacionPermitida } from "@/lib/server/mercadopago";
import { Checkout } from "./checkout";

export default async function PagarCursoPage({ params }: { params: Promise<{ cursoId: string }> }) {
  const user = await requirePage();
  const { cursoId } = await params;
  const curso = await prisma.curso.findUnique({
    where: { id: cursoId },
    include: { actividades: { select: { nivel: true, tipo: true } } },
  });
  if (!curso || curso.estado !== "ACTIVO") notFound();

  const matricula = await prisma.matricula.findUnique({ where: { fielId_cursoId: { fielId: user.fielId, cursoId } } });
  if (matricula) redirect(`/workspace/mis-cursos/${cursoId}`);
  if (Number(curso.costo) <= 0) redirect("/workspace"); // los gratuitos se piden con "Quiero inscribirme"

  const niveles = new Set(curso.actividades.map((a) => a.nivel)).size || 1;
  const tareas = curso.actividades.filter((a) => a.tipo === "TAREA").length;
  const examenes = curso.actividades.filter((a) => a.tipo === "EXAMEN").length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Link href="/workspace" className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <div className="grid gap-5 md:grid-cols-[1fr_360px]">
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <CursoPortada portada={urlPortada(curso)} className="flex min-h-48 flex-col justify-end p-6">
            <span className="w-fit rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">{curso.codigo}</span>
            <h1 className="mt-2 text-2xl font-bold">{curso.nombre}</h1>
          </CursoPortada>
          <div className="space-y-4 p-6">
            {curso.descripcion && <p className="text-muted-foreground text-sm whitespace-pre-line">{curso.descripcion}</p>}
            <ul className="grid grid-cols-2 gap-3 text-sm">
              <li className="flex items-center gap-2"><Layers className="size-4 text-violet-500" /> {niveles} {niveles === 1 ? "nivel" : "niveles"}</li>
              <li className="flex items-center gap-2"><CalendarDays className="size-4 text-violet-500" /> {curso.duracionDias} días de acceso</li>
              <li className="flex items-center gap-2"><FileText className="size-4 text-violet-500" /> {tareas} tareas</li>
              <li className="flex items-center gap-2"><PenLine className="size-4 text-violet-500" /> {examenes} exámenes</li>
            </ul>
          </div>
        </div>
        <Panel title="Resumen del pago" className="h-fit">
          <Checkout cursoId={curso.id} costo={Math.round(Number(curso.costo))} simulado={simulacionPermitida()} />
        </Panel>
      </div>
    </div>
  );
}
