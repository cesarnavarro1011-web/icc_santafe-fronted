import type { Pregunta, Prisma } from "@prisma/client";
import { CircleHelp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";
import { opcionesCursos, type Opcion } from "@/server/opciones";
import { eliminarPregunta, guardarPregunta } from "./actions";

function PreguntaFields({ p, cursos, examenes }: { p?: Pregunta; cursos: Opcion[]; examenes: Opcion[] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Curso *" className="sm:col-span-3">
          <OpcionSelect name="cursoId" opciones={cursos} defaultValue={p?.cursoId} required />
        </Field>
        <Field label="Nivel *">
          <Input name="nivel" type="number" min={1} defaultValue={p?.nivel ?? 1} required />
        </Field>
        <Field label="Puntos">
          <Input name="puntos" type="number" min={0.5} step="0.5" defaultValue={p?.puntos ?? 1} />
        </Field>
        <Field label="Examen específico">
          <OpcionSelect name="actividadId" opciones={examenes} defaultValue={p?.actividadId ?? ""} placeholder="Todos los del nivel" />
        </Field>
      </div>
      <Field label="Pregunta *">
        <Textarea name="pregunta" rows={3} defaultValue={p?.pregunta} required />
      </Field>
      <Field label="Respuesta correcta *">
        <Input name="respuestaCorrecta" defaultValue={p?.respuestaCorrecta} required />
      </Field>
      <p className="text-muted-foreground text-xs">
        La calificación automática compara la respuesta sin distinguir mayúsculas, tildes ni espacios extra.
      </p>
    </>
  );
}

export default async function ExamenesPage({ searchParams }: { searchParams: Promise<{ q?: string; curso?: string }> }) {
  const user = await requirePage(R.DOCENTE);
  const { q, curso } = await searchParams;
  const alcance = await cursosEnAlcance(user);

  const where: Prisma.PreguntaWhereInput = {
    cursoId: curso && (alcance === null || alcance.includes(curso)) ? curso : filtroCurso(alcance),
    ...(q ? { OR: [{ pregunta: { contains: q, mode: "insensitive" } }, { codigo: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [preguntas, cursos, examenesDb] = await Promise.all([
    prisma.pregunta.findMany({ where, include: { curso: true, actividad: true }, orderBy: [{ curso: { nombre: "asc" } }, { nivel: "asc" }, { createdAt: "asc" }] }),
    opcionesCursos(alcance, false),
    prisma.actividad.findMany({ where: { tipo: "EXAMEN", cursoId: filtroCurso(alcance) }, include: { curso: true }, orderBy: { nombre: "asc" } }),
  ]);
  const examenes = examenesDb.map((e) => ({ value: e.id, label: `${e.curso.codigo} · N${e.nivel} · ${e.nombre}` }));

  return (
    <>
      <PageHeader
        title="Banco de preguntas"
        description={`${preguntas.length} preguntas`}
        actions={
          <FormDialog
            title="Nueva pregunta"
            action={guardarPregunta.bind(null, null)}
            successMessage="Pregunta guardada"
            trigger={
              <Button>
                <Plus /> Nueva pregunta
              </Button>
            }
          >
            <PreguntaFields cursos={cursos} examenes={examenes} />
          </FormDialog>
        }
      />
      <SearchBar placeholder="Buscar pregunta..." filtros={[{ name: "curso", label: "Todos los cursos", options: cursos }]} />
      <Panel>
        {preguntas.length === 0 ? (
          <EmptyState icon={CircleHelp}>Sin preguntas.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Pregunta</TableHead>
                <TableHead>Respuesta correcta</TableHead>
                <TableHead>Pts</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {preguntas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant="violet">{p.curso.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    N{p.nivel}
                    {p.actividad && <div className="text-muted-foreground text-xs">{p.actividad.nombre}</div>}
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <div className="line-clamp-2">{p.pregunta}</div>
                  </TableCell>
                  <TableCell className="font-medium text-emerald-700">{p.respuestaCorrecta}</TableCell>
                  <TableCell>{p.puntos}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <FormDialog
                        title="Editar pregunta"
                        action={guardarPregunta.bind(null, p.id)}
                        successMessage="Pregunta actualizada"
                        trigger={
                          <Button size="icon-sm" variant="outline" aria-label="Editar">
                            <Pencil />
                          </Button>
                        }
                      >
                        <PreguntaFields p={p} cursos={cursos} examenes={examenes} />
                      </FormDialog>
                      <ActionButton size="icon-sm" variant="outline" aria-label="Eliminar" confirm="¿Eliminar esta pregunta?" successMessage="Pregunta eliminada" action={eliminarPregunta.bind(null, p.id)}>
                        <Trash2 className="text-red-600" />
                      </ActionButton>
                    </div>
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
