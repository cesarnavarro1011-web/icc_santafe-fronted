import { ClipboardList, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { EmptyState, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha, isoDate } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cursosEnAlcance, filtroCurso } from "@/server/academico";
import { eliminarSesion } from "./actions";
import { RegistroSesion } from "./registro-sesion";

export default async function AsistenciaCursosPage() {
  const user = await requirePage(R.ACADEMICO);
  const alcance = await cursosEnAlcance(user);
  const registra = tieneRol(user.rol, R.REGISTRA_CLASES);

  const [cursos, sesiones] = await Promise.all([
    prisma.curso.findMany({
      where: { id: filtroCurso(alcance), estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      include: {
        matriculas: {
          where: { estado: { in: ["EN_PROGRESO", "APROBADO"] } },
          include: { fiel: { select: { nombre: true, apellido: true } } },
          orderBy: { fiel: { apellido: "asc" } },
        },
      },
    }),
    prisma.sesionClase.findMany({
      where: { cursoId: filtroCurso(alcance) },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 60,
      include: { curso: true, _count: { select: { asistencias: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Asistencia de cursos"
        description={registra ? "Registra cada clase y quiénes asistieron" : "Consulta de las clases dictadas y su asistencia"}
      />
      {registra && (
      <Panel title="Registrar clase">
        <RegistroSesion
          hoy={isoDate(new Date())}
          cursos={cursos.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            estudiantes: c.matriculas.map((m) => ({ fielId: m.fielId, nombre: `${m.fiel.apellido} ${m.fiel.nombre}` })),
          }))}
        />
      </Panel>
      )}
      <Panel title="Clases registradas">
        {sesiones.length === 0 ? (
          <EmptyState icon={ClipboardList}>Aún no hay clases registradas.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Asistentes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sesiones.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{fecha(s.fecha)}</TableCell>
                  <TableCell>
                    <Badge variant="violet">{s.curso.nombre}</Badge>
                  </TableCell>
                  <TableCell>N{s.nivel}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{s.tema ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{s._count.asistencias}</TableCell>
                  <TableCell className="text-right">
                    {registra && (
                    <ActionButton size="icon-sm" variant="ghost" aria-label="Eliminar" confirm="¿Eliminar esta clase y su asistencia?" successMessage="Clase eliminada" action={eliminarSesion.bind(null, s.id)}>
                      <Trash2 className="text-red-600" />
                    </ActionButton>
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
