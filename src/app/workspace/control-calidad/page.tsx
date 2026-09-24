import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, EstadoBadge, Nota, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { ACADEMICO } from "@/lib/config";
import { ESTADO_MATRICULA } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { asistenciaPorFiel, cursosEnAlcance, filtroCurso } from "@/server/academico";
import { alertasIntegridad } from "@/server/dashboards";
import { cn } from "@/lib/utils";

export default async function ControlCalidadPage() {
  const user = await requirePage(R.SUPERVISION);
  const alcance = await cursosEnAlcance(user);

  const [alertas, matriculas] = await Promise.all([
    alertasIntegridad(alcance),
    prisma.matricula.findMany({
      where: { cursoId: filtroCurso(alcance), estado: { in: ["EN_PROGRESO", "APROBADO"] } },
      include: { fiel: true, curso: true },
      orderBy: [{ curso: { nombre: "asc" } }, { fiel: { apellido: "asc" } }],
    }),
  ]);

  const porCurso = new Map<string, Awaited<ReturnType<typeof asistenciaPorFiel>>>();
  for (const cursoId of new Set(matriculas.map((m) => m.cursoId))) porCurso.set(cursoId, await asistenciaPorFiel(cursoId));

  const filas = matriculas.map((m) => {
    const a = porCurso.get(m.cursoId)!(m.fielId);
    const bajaAsistencia = a.total > 0 && a.porcentaje < ACADEMICO.ASISTENCIA_MIN_PCT;
    const aprobadoIrregular = m.estado === "APROBADO" && (bajaAsistencia || m.notaFinal < ACADEMICO.NOTA_MIN_APROBAR);
    return { m, a, bajaAsistencia, aprobadoIrregular };
  });
  const irregulares = filas.filter((f) => f.aprobadoIrregular).length;
  const enRiesgo = filas.filter((f) => f.bajaAsistencia).length;

  return (
    <>
      <PageHeader title="Control de calidad" description="Verifica la integridad de calificaciones y asistencias" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Resumen label="Alertas de calificación" valor={alertas.length} malo={alertas.length > 0} />
        <Resumen label={`Asistencia < ${ACADEMICO.ASISTENCIA_MIN_PCT}%`} valor={enRiesgo} malo={enRiesgo > 0} />
        <Resumen label="Aprobados irregulares" valor={irregulares} malo={irregulares > 0} />
      </div>

      <Panel title="Alertas de integridad">
        {alertas.length === 0 ? (
          <EmptyState icon={ShieldCheck}>Sin irregularidades en las calificaciones.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {alertas.map((a) => (
              <li key={a.id} className="flex gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <strong>{a.tipo}</strong> — {a.fiel} · {a.curso}
                  <div className="text-xs opacity-75">{a.detalle}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Asistencia y notas por estudiante">
        {filas.length === 0 ? (
          <EmptyState icon={ShieldCheck}>Sin estudiantes activos en tus cursos.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead className="w-44">Asistencia</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map(({ m, a, bajaAsistencia, aprobadoIrregular }) => (
                <TableRow key={m.id} className={cn(aprobadoIrregular && "bg-red-50/60")}>
                  <TableCell className="font-medium">
                    {m.fiel.nombre} {m.fiel.apellido}
                    {aprobadoIrregular && <Badge variant="danger" className="ml-2">revisar</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="violet">{m.curso.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={a.porcentaje} barClassName={bajaAsistencia ? "bg-red-500" : "bg-emerald-500"} />
                      <span className={cn("text-xs", bajaAsistencia && "font-semibold text-red-600")}>{a.total ? `${a.porcentaje}%` : "—"}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {a.asistidas} de {a.total} clases
                    </div>
                  </TableCell>
                  <TableCell>
                    <Nota valor={m.notaFinal || null} />
                  </TableCell>
                  <TableCell>
                    <EstadoBadge valor={m.estado} mapa={ESTADO_MATRICULA} />
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

function Resumen({ label, valor, malo }: { label: string; valor: number; malo: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", malo ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      <div className="text-3xl font-bold">{valor}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}
