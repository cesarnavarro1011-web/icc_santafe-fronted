import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { EquipoCursoInfo } from "@/components/workspace/equipo-curso";
import { EmptyState, EstadoBadge, Nota, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ACADEMICO } from "@/lib/config";
import { ESTADO_CERTIFICADO, ESTADO_MATRICULA, fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { asistenciaPorFiel, cursosEnAlcance, diasRestantes } from "@/server/academico";
import { aprobarYCertificar, recalcular } from "../actions";

export default async function ClaseDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage(R.ACADEMICO);
  const { id } = await params;
  const alcance = await cursosEnAlcance(user);
  if (alcance !== null && !alcance.includes(id)) notFound();

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      maestros: { select: { rol: true, nivel: true, fiel: { select: { nombre: true, apellido: true } } } },
      supervisores: { where: { estado: "ACTIVO" }, select: { fiel: { select: { nombre: true, apellido: true } } } },
      _count: { select: { actividades: { where: { tipo: { in: ["TAREA", "EXAMEN"] } } } } },
      matriculas: {
        include: {
          fiel: true,
          certificados: true,
          entregas: { where: { estado: "ENVIADA" }, select: { id: true } },
        },
        orderBy: [{ estado: "asc" }, { fiel: { apellido: "asc" } }],
      },
    },
  });
  if (!curso) notFound();
  const asistencia = await asistenciaPorFiel(curso.id);
  const puedeCertificar = tieneRol(user.rol, R.CALIFICA);
  const verTareas = tieneRol(user.rol, R.DOCENTE); // la página de tareas es para maestros, pastor y superadmin

  return (
    <>
      <Link href="/workspace/clases" className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Cursos activos
      </Link>
      <PageHeader title={curso.nombre} description={`${curso.codigo} · ${curso.matriculas.length} estudiantes`} />
      <EquipoCursoInfo equipo={curso} className="bg-card flex flex-wrap gap-x-6 gap-y-1 rounded-xl border p-3 shadow-sm [&>p]:m-0" />
      <Panel>
        {curso.matriculas.length === 0 ? (
          <EmptyState icon={Users}>Sin estudiantes matriculados.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead className="w-36">Progreso</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Asistencia</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Certificado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {curso.matriculas.map((m) => {
                const a = asistencia(m.fielId);
                const cumpleAsist = a.total === 0 || a.porcentaje >= ACADEMICO.ASISTENCIA_MIN_PCT;
                const cert = m.certificados.find((c) => c.estado !== "ANULADO");
                const dias = diasRestantes(m.fechaVencimiento);
                // Requisitos para aprobar, en el orden en que se muestran
                const falta =
                  m.progreso < 100
                    ? m.entregas.length
                      ? "Tiene entregas sin calificar"
                      : "Faltan actividades por completar"
                    : m.notaFinal < ACADEMICO.NOTA_MIN_APROBAR
                      ? `Nota final menor a ${ACADEMICO.NOTA_MIN_APROBAR}`
                      : !cumpleAsist
                        ? `Asistencia menor a ${ACADEMICO.ASISTENCIA_MIN_PCT}%`
                        : null;
                const total = curso._count.actividades;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.fiel.nombre} {m.fiel.apellido}
                      {m.entregas.length > 0 &&
                        (verTareas ? (
                          <Link href={`/workspace/tareas?fiel=${m.fielId}&curso=${curso.id}`} title="Ir a revisar sus entregas">
                            <Badge variant="warning" className="ml-2 cursor-pointer hover:bg-amber-100 hover:underline">
                              {m.entregas.length} por revisar →
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="warning" className="ml-2">
                            {m.entregas.length} por revisar
                          </Badge>
                        ))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.progreso}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{m.progreso}%</span>
                      </div>
                      <div className="text-muted-foreground text-xs whitespace-nowrap">
                        {Math.round((m.progreso / 100) * total)} de {total} calificadas
                      </div>
                    </TableCell>
                    <TableCell>
                      <Nota valor={m.notaFinal || null} />
                    </TableCell>
                    <TableCell>
                      <span className={cumpleAsist ? "text-emerald-700" : "font-semibold text-red-600"}>
                        {a.total ? `${a.porcentaje}%` : "—"}
                      </span>
                      <div className="text-muted-foreground text-xs">
                        {a.asistidas}/{a.total} clases
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {fecha(m.fechaVencimiento)}
                      {dias !== null && dias < 0 && m.estado === "EN_PROGRESO" && <div className="text-red-600">vencido</div>}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge valor={m.estado} mapa={ESTADO_MATRICULA} />
                    </TableCell>
                    <TableCell>{cert ? <EstadoBadge valor={cert.estado} mapa={ESTADO_CERTIFICADO} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <ActionButton size="icon-sm" variant="ghost" aria-label="Recalcular" successMessage="Nota recalculada" action={recalcular.bind(null, m.id)}>
                          <RefreshCw />
                        </ActionButton>
                        {puedeCertificar && !cert && (
                          <div className="flex flex-col items-end">
                            <ActionButton
                              size="sm"
                              disabled={!!falta}
                              title={falta ?? undefined}
                              confirm={`¿Aprobar a ${m.fiel.nombre} y firmar su certificado como maestro?`}
                              successMessage="Certificado enviado al supervisor"
                              action={aprobarYCertificar.bind(null, m.id)}
                            >
                              <Award /> Aprobar
                            </ActionButton>
                            {falta && <span className="text-muted-foreground mt-0.5 text-[10px]">{falta}</span>}
                          </div>
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
      <p className="text-muted-foreground text-xs">
        Para aprobar se exige tener todas las actividades calificadas (100%), nota final ≥ {ACADEMICO.NOTA_MIN_APROBAR} y asistencia ≥ {ACADEMICO.ASISTENCIA_MIN_PCT}%.
        El progreso cuenta solo actividades calificadas; lo entregado que espera revisión se indica junto al nombre. Al aprobar, el
        certificado pasa al supervisor y luego al pastor.
      </p>
    </>
  );
}
