import type { CodigoPromocion } from "@prisma/client";
import { Pause, Pencil, Play, Plus, TicketPercent, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { EmptyState, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { dinero, fecha, isoDate } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesCursos, type Opcion } from "@/server/opciones";
import { cambiarActivoPromocion, eliminarPromocion, guardarPromocion } from "./actions";

function PromoFields({ p, cursos }: { p?: CodigoPromocion; cursos: Opcion[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Código *">
        <Input name="codigo" defaultValue={p?.codigo} required maxLength={30} placeholder="Ej: JOVENES2026" className="uppercase" />
      </Field>
      <Field label="Curso">
        <OpcionSelect name="cursoId" opciones={cursos} defaultValue={p?.cursoId ?? ""} placeholder="Todos los cursos" />
      </Field>
      <Field label="Tipo de descuento">
        <NativeSelect name="tipo" defaultValue={p?.tipo ?? "PORCENTAJE"}>
          <option value="PORCENTAJE">Porcentaje (%)</option>
          <option value="VALOR">Valor fijo ($)</option>
        </NativeSelect>
      </Field>
      <Field label="Descuento *">
        <Input name="valor" type="number" min={1} step="any" defaultValue={p ? Number(p.valor) : ""} required placeholder="Ej: 20 (%) o 50000 ($)" />
      </Field>
      <Field label="Límite de usos (vacío = sin límite)">
        <Input name="usosMax" type="number" min={1} defaultValue={p?.usosMax ?? ""} />
      </Field>
      <Field label="Estado">
        <NativeSelect name="activo" defaultValue={p?.activo === false ? "false" : "true"}>
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </NativeSelect>
      </Field>
      <Field label="Válido desde (opcional)">
        <Input name="validoDesde" type="date" defaultValue={isoDate(p?.validoDesde)} />
      </Field>
      <Field label="Válido hasta (opcional)">
        <Input name="validoHasta" type="date" defaultValue={isoDate(p?.validoHasta)} />
      </Field>
      <Field label="Descripción (la ve el estudiante al aplicarlo)" className="sm:col-span-2">
        <Input name="descripcion" defaultValue={p?.descripcion ?? ""} placeholder="Ej: Beca para el grupo de jóvenes" />
      </Field>
      <p className="text-muted-foreground text-xs sm:col-span-2">
        Con 100 % de descuento el estudiante queda inscrito de inmediato, sin pasar por Mercado Pago. El uso se cuenta cuando el pago queda aprobado.
      </p>
    </div>
  );
}

export default async function PromocionesPage() {
  await requirePage(R.ADMIN);
  const [promos, cursos] = await Promise.all([
    prisma.codigoPromocion.findMany({ orderBy: [{ activo: "desc" }, { createdAt: "desc" }], include: { curso: { select: { nombre: true } } } }),
    opcionesCursos(null, false),
  ]);
  const ahora = new Date();

  return (
    <>
      <PageHeader
        title="Códigos de promoción"
        description="Descuentos que el estudiante escribe al pagar un curso con Mercado Pago."
        actions={
          <FormDialog
            title="Nuevo código"
            action={guardarPromocion.bind(null, null)}
            successMessage="Código creado"
            trigger={
              <Button>
                <Plus /> Nuevo código
              </Button>
            }
          >
            <PromoFields cursos={cursos} />
          </FormDialog>
        }
      />
      <Panel>
        {promos.length === 0 ? (
          <EmptyState icon={TicketPercent}>Aún no hay códigos de promoción.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead className="text-right">Usos</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.map((p) => {
                const agotado = p.usosMax !== null && p.usos >= p.usosMax;
                const vencido = !!p.validoHasta && p.validoHasta < ahora;
                const futuro = !!p.validoDesde && p.validoDesde > ahora;
                const estado = !p.activo
                  ? { t: "Inactivo", v: "muted" as const }
                  : agotado
                    ? { t: "Agotado", v: "warning" as const }
                    : vencido
                      ? { t: "Vencido", v: "warning" as const }
                      : futuro
                        ? { t: "Programado", v: "info" as const }
                        : { t: "Activo", v: "success" as const };
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-mono font-semibold">{p.codigo}</span>
                      {p.descripcion && <div className="text-muted-foreground max-w-56 truncate text-xs">{p.descripcion}</div>}
                    </TableCell>
                    <TableCell className="font-medium">{p.tipo === "PORCENTAJE" ? `${Number(p.valor)} %` : dinero(p.valor)}</TableCell>
                    <TableCell className="text-xs">{p.curso?.nombre ?? "Todos"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.usos}
                      {p.usosMax !== null && <span className="text-muted-foreground"> / {p.usosMax}</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.validoDesde || p.validoHasta ? `${p.validoDesde ? fecha(p.validoDesde) : "…"} – ${p.validoHasta ? fecha(p.validoHasta) : "…"}` : "Sin fecha"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={estado.v}>{estado.t}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <FormDialog
                          title={`Editar ${p.codigo}`}
                          action={guardarPromocion.bind(null, p.id)}
                          successMessage="Código actualizado"
                          trigger={
                            <Button size="icon-sm" variant="outline" aria-label="Editar">
                              <Pencil />
                            </Button>
                          }
                        >
                          <PromoFields p={p} cursos={cursos} />
                        </FormDialog>
                        <ActionButton
                          size="icon-sm"
                          variant="outline"
                          aria-label={p.activo ? "Desactivar" : "Activar"}
                          title={p.activo ? "Desactivar" : "Activar"}
                          successMessage={p.activo ? "Código desactivado" : "Código activado"}
                          action={cambiarActivoPromocion.bind(null, p.id, !p.activo)}
                        >
                          {p.activo ? <Pause /> : <Play className="text-emerald-600" />}
                        </ActionButton>
                        <ActionButton
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Eliminar"
                          confirm={`¿Eliminar el código ${p.codigo}?`}
                          successMessage="Código eliminado"
                          action={eliminarPromocion.bind(null, p.id)}
                        >
                          <Trash2 className="text-red-600" />
                        </ActionButton>
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
