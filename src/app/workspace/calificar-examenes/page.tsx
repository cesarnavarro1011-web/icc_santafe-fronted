import type { Prisma } from "@prisma/client";
import { CheckCheck, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/workspace/form-dialog";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, Field, Nota, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ACADEMICO } from "@/lib/config";
import { fechaHora } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";
import type { DetalleRespuesta } from "@/server/examenes";
import { cn } from "@/lib/utils";
import { editarNotaExamen } from "./actions";

export default async function CalificarExamenesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requirePage(R.DOCENTE);
  const { q } = await searchParams;
  const alcance = await cursosEnAlcance(user);
  const califica = tieneRol(user.rol, R.CALIFICA);

  const where: Prisma.IntentoExamenWhereInput = {
    actividad: { cursoId: filtroCurso(alcance) },
    ...(q
      ? {
          OR: [
            { fiel: { nombre: { contains: q, mode: "insensitive" } } },
            { fiel: { apellido: { contains: q, mode: "insensitive" } } },
            { actividad: { curso: { nombre: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const intentos = await prisma.intentoExamen.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { fiel: true, actividad: { include: { curso: true } } },
  });

  return (
    <>
      <PageHeader
        title={califica ? "Calificar exámenes" : "Exámenes presentados"}
        description={califica ? "Revisa la calificación automática y corrígela si es necesario" : "Resultados de los exámenes · solo consulta"}
      />
      <SearchBar placeholder="Buscar por estudiante o curso..." />
      <Panel>
        {intentos.length === 0 ? (
          <EmptyState icon={CheckCheck}>Aún no hay exámenes presentados.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Nota auto.</TableHead>
                <TableHead>Nota final</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {intentos.map((i) => {
                const detalle = (i.detalle as DetalleRespuesta[]) ?? [];
                const final = i.notaManual ?? i.notaAutomatica;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.fiel.nombre} {i.fiel.apellido}
                    </TableCell>
                    <TableCell>
                      {i.actividad.nombre}
                      <div className="text-muted-foreground text-xs">
                        <Badge variant="violet">{i.actividad.curso.codigo}</Badge> Nivel {i.actividad.nivel}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{fechaHora(i.createdAt)}</TableCell>
                    <TableCell className="text-xs">
                      {i.puntosObtenidos}/{i.puntosTotal}
                    </TableCell>
                    <TableCell>
                      <Nota valor={i.notaAutomatica} />
                    </TableCell>
                    <TableCell>
                      <Nota valor={final} />
                      {i.notaManual !== null && <div className="text-muted-foreground text-xs">manual</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye /> Respuestas
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                {i.fiel.nombre} {i.fiel.apellido} · {i.actividad.nombre}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              {detalle.map((d, n) => (
                                <div key={d.preguntaId} className={cn("rounded-lg border", d.correcto ? "border-emerald-200" : "border-red-200")}>
                                  <div className={cn("flex justify-between px-3 py-1.5 text-xs font-semibold", d.correcto ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                                    <span>{d.correcto ? "✓ Correcta" : "✗ Incorrecta"} · {d.puntos} pt</span>
                                    <span>Pregunta {n + 1}</span>
                                  </div>
                                  <div className="space-y-2 px-3 py-2 text-sm">
                                    <p className="font-medium">{d.pregunta}</p>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <span className="text-muted-foreground block uppercase">Respuesta del estudiante</span>
                                        <span className={d.correcto ? "text-emerald-700" : "text-red-700"}>{d.respuesta || "(sin respuesta)"}</span>
                                      </div>
                                      {!d.correcto && (
                                        <div>
                                          <span className="text-muted-foreground block uppercase">Correcta</span>
                                          <span className="text-emerald-700">{d.respuestaCorrecta}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {califica && (
                        <FormDialog
                          title="Editar nota del examen"
                          description="Sobrescribe la calificación automática."
                          action={editarNotaExamen.bind(null, i.id)}
                          successMessage="Nota actualizada"
                          trigger={
                            <Button size="icon-sm" variant="outline" aria-label="Editar nota">
                              <Pencil />
                            </Button>
                          }
                        >
                          <Field label={`Nueva nota (0–${ACADEMICO.NOTA_MAX})`}>
                            <Input name="nota" type="number" min={0} max={ACADEMICO.NOTA_MAX} step="0.1" defaultValue={final} required />
                          </Field>
                          <Field label="Motivo">
                            <Textarea name="motivo" rows={2} placeholder="Ej: pregunta ambigua" defaultValue={i.motivoEdicion ?? ""} />
                          </Field>
                        </FormDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
