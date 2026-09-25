import Link from "next/link";
import type { EstadoEntrega, Prisma } from "@prisma/client";
import { ArrowLeft, ExternalLink, FileText, Inbox, Pen, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/workspace/form-dialog";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, EstadoBadge, Field, Nota, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ACADEMICO } from "@/lib/config";
import { ESTADO_ENTREGA, fechaHora, opciones } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";
import { calificarEntrega } from "./actions";

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; fiel?: string; curso?: string }>;
}) {
  const user = await requirePage(R.DOCENTE);
  const { q, estado = "ENVIADA", fiel, curso } = await searchParams;
  const alcance = await cursosEnAlcance(user);
  const califica = tieneRol(user.rol, R.CALIFICA);

  const where: Prisma.EntregaWhereInput = {
    actividad: {
      cursoId: curso && (alcance === null || alcance.includes(curso)) ? curso : filtroCurso(alcance),
      tipo: "TAREA",
    },
    ...(fiel ? { fielId: fiel } : {}),
    ...(estado !== "TODAS" ? { estado: estado as EstadoEntrega } : {}),
    ...(q
      ? {
          OR: [
            { fiel: { nombre: { contains: q, mode: "insensitive" } } },
            { fiel: { apellido: { contains: q, mode: "insensitive" } } },
            { actividad: { nombre: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const entregas = await prisma.entrega.findMany({
    where,
    orderBy: { fechaEntrega: "desc" },
    take: 200,
    include: { fiel: true, actividad: { include: { curso: true } }, nota: true },
  });

  // Filtro que llega desde "Cursos activos" (etiqueta "por revisar" de un alumno)
  const filtroAlumno =
    fiel || curso
      ? await Promise.all([
          fiel ? prisma.fiel.findUnique({ where: { id: fiel }, select: { nombre: true, apellido: true } }) : null,
          curso ? prisma.curso.findUnique({ where: { id: curso }, select: { nombre: true } }) : null,
        ])
      : null;

  return (
    <>
      {filtroAlumno && (
        <div className="flex flex-wrap items-center gap-2">
          {curso && (
            <Link href={`/workspace/clases/${curso}`} className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
              <ArrowLeft className="size-4" /> Volver al curso
            </Link>
          )}
          <span className="ml-auto flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-800">
            Mostrando {filtroAlumno[0] ? `${filtroAlumno[0].nombre} ${filtroAlumno[0].apellido}` : "todas"}
            {filtroAlumno[1] && ` · ${filtroAlumno[1].nombre}`}
            <Link href="/workspace/tareas" aria-label="Quitar filtro" className="rounded-full p-0.5 hover:bg-violet-100">
              <X className="size-3.5" />
            </Link>
          </span>
        </div>
      )}
      <PageHeader title={califica ? "Revisar tareas" : "Tareas entregadas"} description={califica ? `${entregas.length} entregas` : `${entregas.length} entregas · solo consulta`} />
      <SearchBar
        placeholder="Buscar por estudiante o actividad..."
        filtros={[{ name: "estado", label: "Por revisar (enviadas)", options: [{ value: "TODAS", label: "Todas" }, ...opciones(ESTADO_ENTREGA).filter((o) => o.value !== "ENVIADA")] }]}
      />
      <Panel>
        {entregas.length === 0 ? (
          <EmptyState icon={Inbox}>No hay entregas con este filtro. 🎉</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Entregada</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.fiel.nombre} {e.fiel.apellido}
                  </TableCell>
                  <TableCell>
                    <Badge variant="violet">{e.actividad.curso.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    {e.actividad.nombre}
                    <div className="text-muted-foreground text-xs">Nivel {e.actividad.nivel}</div>
                  </TableCell>
                  <TableCell className="text-xs">{fechaHora(e.fechaEntrega)}</TableCell>
                  <TableCell>
                    {e.archivoPath ? (
                      <a className="flex items-center gap-1 text-xs text-blue-600 hover:underline" href={`/api/archivos/entrega/${e.id}`} target="_blank" rel="noreferrer">
                        <FileText className="size-3.5" /> Ver PDF
                      </a>
                    ) : e.linkExterno ? (
                      <a className="flex items-center gap-1 text-xs text-blue-600 hover:underline" href={e.linkExterno} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" /> Drive
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge valor={e.estado} mapa={ESTADO_ENTREGA} />
                  </TableCell>
                  <TableCell>
                    <Nota valor={e.nota ? (e.nota.nota / e.nota.notaMax) * ACADEMICO.NOTA_MAX : null} />
                  </TableCell>
                  <TableCell className="text-right">
                    {califica && (
                    <FormDialog
                      title={`Calificar · ${e.actividad.nombre}`}
                      description={`${e.fiel.nombre} ${e.fiel.apellido} — ${e.actividad.curso.nombre}`}
                      action={calificarEntrega.bind(null, e.id)}
                      successMessage="Calificación guardada"
                      submitLabel="Guardar calificación"
                      trigger={
                        <Button size="sm" variant={e.estado === "ENVIADA" ? "default" : "outline"}>
                          <Pen /> {e.estado === "ENVIADA" ? "Calificar" : "Recalificar"}
                        </Button>
                      }
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={`Nota (0–${e.actividad.notaMax})`}>
                          <Input name="nota" type="number" min={0} max={e.actividad.notaMax} step="0.1" defaultValue={e.nota?.nota ?? ""} />
                        </Field>
                        <Field label="Resultado">
                          <NativeSelect name="estado" defaultValue={e.estado === "ENVIADA" ? "APROBADA" : e.estado}>
                            <option value="APROBADA">✓ Aprobar</option>
                            <option value="REPROBADA">✗ Reprobar</option>
                            <option value="DEVUELTA">↺ Devolver para corrección</option>
                          </NativeSelect>
                        </Field>
                      </div>
                      <Field label="Comentario para el estudiante">
                        <Textarea name="comentario" rows={3} defaultValue={e.comentario ?? ""} />
                      </Field>
                      <p className="text-muted-foreground text-xs">
                        Mínimo {ACADEMICO.NOTA_MIN_APROBAR}/{ACADEMICO.NOTA_MAX} para aprobar. El estudiante recibe un correo con el resultado.
                      </p>
                    </FormDialog>
                    )}
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
