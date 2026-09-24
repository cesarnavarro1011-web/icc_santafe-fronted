import type { EstadoPago, Inscripcion, Prisma } from "@prisma/client";
import { CheckCircle, ClipboardList, Clock, CreditCard, Gift, Paperclip, Pencil, Plus, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { SearchBar } from "@/components/workspace/search-bar";
import { EmptyState, EstadoBadge, Field, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { dinero, ESTADO_PAGO, fecha, METODO_PAGO, opciones } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesCursos, opcionesFieles } from "@/server/opciones";
import { actualizarPago, crearInscripcion, repararInscripciones } from "./actions";

function CamposPago({ i }: { i?: Inscripcion }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Costo total">
        <Input name="costoTotal" type="number" min={0} step="any" defaultValue={i ? Number(i.costoTotal) : 0} />
      </Field>
      <Field label="Monto pagado">
        <Input name="montoPagado" type="number" min={0} step="any" defaultValue={i ? Number(i.montoPagado) : 0} />
      </Field>
      <Field label="Estado del pago">
        <NativeSelect name="estadoPago" defaultValue={i?.estadoPago ?? "COMPLETADO"}>
          {opciones(ESTADO_PAGO).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Método">
        <NativeSelect name="metodoPago" defaultValue={i?.metodoPago ?? "EFECTIVO"}>
          <option value="">—</option>
          {opciones(METODO_PAGO).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Comprobante (PDF o imagen, opcional)" className="sm:col-span-2">
        <Input name="comprobante" type="file" accept="application/pdf,image/png,image/jpeg" />
      </Field>
    </div>
  );
}

export default async function InscripcionesPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await requirePage(R.ADMIN);
  const { q, estado } = await searchParams;
  const where: Prisma.InscripcionWhereInput = {
    ...(estado ? { estadoPago: estado as EstadoPago } : {}),
    ...(q
      ? {
          OR: [
            { codigo: { contains: q, mode: "insensitive" } },
            { fiel: { nombre: { contains: q, mode: "insensitive" } } },
            { fiel: { apellido: { contains: q, mode: "insensitive" } } },
            { fiel: { codigo: { contains: q, mode: "insensitive" } } },
            { curso: { nombre: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [inscripciones, conteo, fieles, cursos] = await Promise.all([
    prisma.inscripcion.findMany({ where, orderBy: { fecha: "desc" }, take: 200, include: { fiel: true, curso: true } }),
    prisma.inscripcion.groupBy({ by: ["estadoPago"], _count: true }),
    opcionesFieles(),
    opcionesCursos(),
  ]);
  const n = (e: EstadoPago) => conteo.find((c) => c.estadoPago === e)?._count ?? 0;
  const total = conteo.reduce((s, c) => s + c._count, 0);

  return (
    <>
      <PageHeader
        title="Inscripciones y pagos"
        description="Al marcar un pago como Completado o Exento el fiel queda matriculado en el curso."
        actions={
          <>
            <ActionButton variant="outline" action={repararInscripciones} successMessage="Inscripciones revisadas">
              <Wrench /> Reparar matrículas
            </ActionButton>
            <FormDialog
              title="Nueva inscripción"
              action={crearInscripcion}
              successMessage="Inscripción guardada"
              trigger={
                <Button>
                  <Plus /> Nueva inscripción
                </Button>
              }
            >
              <Field label="Fiel *">
                <OpcionSelect name="fielId" opciones={fieles} required />
              </Field>
              <Field label="Curso *">
                <OpcionSelect name="cursoId" opciones={cursos} required />
              </Field>
              <CamposPago />
            </FormDialog>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={ClipboardList} label="Total" value={total} color="violet" />
        <KpiCard icon={CheckCircle} label="Completados" value={n("COMPLETADO")} color="green" />
        <KpiCard icon={Clock} label="Pendientes / abono" value={n("PENDIENTE") + n("ABONO")} color="amber" />
        <KpiCard icon={Gift} label="Exentos" value={n("EXENTO")} color="blue" />
      </div>
      <SearchBar placeholder="Buscar por fiel, curso o código..." filtros={[{ name: "estado", label: "Todos los estados", options: opciones(ESTADO_PAGO) }]} />
      <Panel>
        {inscripciones.length === 0 ? (
          <EmptyState icon={CreditCard}>Sin inscripciones.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fiel</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Método</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscripciones.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">{i.codigo}</TableCell>
                  <TableCell className="font-medium">
                    {i.fiel.nombre} {i.fiel.apellido}
                  </TableCell>
                  <TableCell>
                    <Badge variant="violet">{i.curso.nombre}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{fecha(i.fecha)}</TableCell>
                  <TableCell>{dinero(i.costoTotal)}</TableCell>
                  <TableCell className="font-semibold">{dinero(i.montoPagado)}</TableCell>
                  <TableCell>
                    <EstadoBadge valor={i.estadoPago} mapa={ESTADO_PAGO} />
                  </TableCell>
                  <TableCell className="text-xs">{i.metodoPago ? METODO_PAGO[i.metodoPago] : "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      {i.comprobantePath && (
                        <Button size="icon-sm" variant="ghost" asChild aria-label="Ver comprobante">
                          <a href={`/api/archivos/comprobante/${i.id}`} target="_blank" rel="noreferrer">
                            <Paperclip />
                          </a>
                        </Button>
                      )}
                      <FormDialog
                        title={`Actualizar pago · ${i.codigo}`}
                        description={`${i.fiel.nombre} ${i.fiel.apellido} — ${i.curso.nombre}`}
                        action={actualizarPago.bind(null, i.id)}
                        successMessage="Pago actualizado"
                        trigger={
                          <Button size="icon-sm" variant="outline" aria-label="Editar pago">
                            <Pencil />
                          </Button>
                        }
                      >
                        <CamposPago i={i} />
                      </FormDialog>
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
