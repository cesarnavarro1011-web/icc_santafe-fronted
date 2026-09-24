import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { EmptyState, EstadoBadge, Nota, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { dinero, ESTADO_MATRICULA, ESTADO_REGISTRO, fecha, ROL_MAESTRO, TIPO_ACTIVIDAD } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { eliminarActividad, guardarActividad, guardarCurso } from "../actions";
import { ActividadFields, CursoFields } from "../curso-form";

export default async function CursoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage(R.ADMIN);
  const { id } = await params;
  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      actividades: { orderBy: [{ nivel: "asc" }, { orden: "asc" }, { createdAt: "asc" }] },
      maestros: { include: { fiel: true } },
      supervisores: { include: { fiel: true } },
      matriculas: { include: { fiel: true }, orderBy: { fechaInicio: "desc" } },
      _count: { select: { preguntas: true, sesiones: true } },
    },
  });
  if (!curso) notFound();

  const niveles = [...new Set(curso.actividades.map((a) => a.nivel))];

  return (
    <>
      <Link href="/workspace/cursos" className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Catálogo
      </Link>
      <PageHeader
        title={curso.nombre}
        description={`${curso.codigo} · ${curso.duracionDias} días · ${Number(curso.costo) > 0 ? dinero(curso.costo) : "Gratis"}`}
        actions={
          <>
            <EstadoBadge valor={curso.estado} mapa={ESTADO_REGISTRO} />
            <FormDialog
              title="Editar curso"
              action={guardarCurso.bind(null, curso.id)}
              successMessage="Curso actualizado"
              trigger={
                <Button variant="outline">
                  <Pencil /> Editar
                </Button>
              }
            >
              <CursoFields curso={curso} />
            </FormDialog>
            <FormDialog
              title="Nueva actividad"
              action={guardarActividad.bind(null, curso.id, null)}
              successMessage="Actividad creada"
              trigger={
                <Button>
                  <Plus /> Actividad
                </Button>
              }
            >
              <ActividadFields />
            </FormDialog>
          </>
        }
      />
      {curso.descripcion && <p className="text-muted-foreground max-w-3xl text-sm">{curso.descripcion}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {niveles.length === 0 && (
            <Panel>
              <EmptyState icon={Layers}>Este curso aún no tiene actividades.</EmptyState>
            </Panel>
          )}
          {niveles.map((nivel) => (
            <Panel key={nivel} title={`Nivel ${nivel}`}>
              <ul className="divide-y">
                {curso.actividades
                  .filter((a) => a.nivel === nivel)
                  .map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <EstadoBadge valor={a.tipo} mapa={TIPO_ACTIVIDAD} />
                          <span className="font-medium">{a.nombre}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {a.codigo} · nota máx. {a.notaMax} · peso {a.peso}%
                          {a.instrucciones && <> · {a.instrucciones.slice(0, 80)}</>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.materialPath && (
                          <Button size="icon-sm" variant="ghost" asChild aria-label="Material">
                            <a href={`/api/archivos/material/${a.id}`} target="_blank" rel="noreferrer">
                              <FileText />
                            </a>
                          </Button>
                        )}
                        {a.linkMaterial && (
                          <Button size="icon-sm" variant="ghost" asChild aria-label="Link">
                            <a href={a.linkMaterial} target="_blank" rel="noreferrer">
                              <ExternalLink />
                            </a>
                          </Button>
                        )}
                        <FormDialog
                          title="Editar actividad"
                          action={guardarActividad.bind(null, curso.id, a.id)}
                          successMessage="Actividad actualizada"
                          trigger={
                            <Button size="icon-sm" variant="outline" aria-label="Editar">
                              <Pencil />
                            </Button>
                          }
                        >
                          <ActividadFields actividad={a} />
                        </FormDialog>
                        <ActionButton
                          size="icon-sm"
                          variant="outline"
                          aria-label="Eliminar"
                          confirm={`¿Eliminar "${a.nombre}"?`}
                          successMessage="Actividad eliminada"
                          action={eliminarActividad.bind(null, a.id)}
                        >
                          <Trash2 className="text-red-600" />
                        </ActionButton>
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
          ))}
        </div>

        <div className="space-y-5">
          <Panel title="Equipo" actions={<Link href="/workspace/asignaciones" className="text-xs text-violet-700 hover:underline">Asignar</Link>}>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Maestros</p>
            {curso.maestros.length === 0 && <p className="text-muted-foreground text-sm">Sin maestros.</p>}
            <ul className="mb-3 space-y-1 text-sm">
              {curso.maestros.map((m) => (
                <li key={m.id}>
                  {m.fiel.nombre} {m.fiel.apellido}{" "}
                  <span className="text-muted-foreground text-xs">
                    · {ROL_MAESTRO[m.rol]} · {m.nivel ? `nivel ${m.nivel}` : "todos los niveles"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Supervisores</p>
            {curso.supervisores.length === 0 && <p className="text-muted-foreground text-sm">Sin supervisores.</p>}
            <ul className="space-y-1 text-sm">
              {curso.supervisores.map((s) => (
                <li key={s.id}>
                  {s.fiel.nombre} {s.fiel.apellido} <span className="text-muted-foreground text-xs">· {s.nivelAutorizado}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Resumen">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Preguntas</dt>
              <dd className="text-right font-semibold">{curso._count.preguntas}</dd>
              <dt className="text-muted-foreground">Clases dictadas</dt>
              <dd className="text-right font-semibold">{curso._count.sesiones}</dd>
              <dt className="text-muted-foreground">Estudiantes</dt>
              <dd className="text-right font-semibold">{curso.matriculas.length}</dd>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel title="Estudiantes matriculados">
        {curso.matriculas.length === 0 ? (
          <EmptyState icon={Layers}>Sin estudiantes. Se matriculan desde Inscripciones y pagos.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="w-40">Progreso</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curso.matriculas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.fiel.nombre} {m.fiel.apellido}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{m.codigo}</TableCell>
                  <TableCell className="text-xs">{fecha(m.fechaInicio)}</TableCell>
                  <TableCell className="text-xs">{fecha(m.fechaVencimiento)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={m.progreso} />
                      <span className="text-xs">{m.progreso}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Nota valor={m.notaFinal || null} />
                  </TableCell>
                  <TableCell>
                    <EstadoBadge valor={m.estado} mapa={ESTADO_MATRICULA} />
                    {m.aprobadoMaestroAt && <Badge variant="success" className="ml-1">✓ maestro</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
