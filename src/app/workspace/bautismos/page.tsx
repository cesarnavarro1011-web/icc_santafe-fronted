import { Droplets, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { EmptyState, EstadoBadge, Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha, opciones, TIPO_BAUTISMO } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesFieles } from "@/server/opciones";
import { eliminarBautismo, registrarBautismo } from "./actions";

export default async function BautismosPage() {
  const user = await requirePage(R.PASTORAL);
  const [bautismos, fieles] = await Promise.all([
    prisma.bautismo.findMany({ orderBy: { fecha: "desc" }, include: { fiel: true } }),
    opcionesFieles(),
  ]);
  const puedeEliminar = tieneRol(user.rol, R.ADMIN);

  return (
    <>
      <PageHeader
        title="Bautismos"
        description={`${bautismos.length} registros`}
        actions={
          <FormDialog
            title="Registrar bautismo"
            description="El fiel quedará marcado como bautizado."
            action={registrarBautismo}
            successMessage="Bautismo registrado"
            trigger={
              <Button>
                <Plus /> Nuevo bautismo
              </Button>
            }
          >
            <Field label="Fiel *">
              <OpcionSelect name="fielId" opciones={fieles} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha *">
                <Input name="fecha" type="date" required />
              </Field>
              <Field label="Tipo">
                <NativeSelect name="tipo" defaultValue="AGUA">
                  {opciones(TIPO_BAUTISMO).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Ministro (pastor)">
                <Input name="ministro" defaultValue={user.name} />
              </Field>
              <Field label="Lugar / sede">
                <Input name="lugar" />
              </Field>
            </div>
          </FormDialog>
        }
      />
      <Panel>
        {bautismos.length === 0 ? (
          <EmptyState icon={Droplets}>Sin bautismos registrados.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiel</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Ministro</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Tipo</TableHead>
                {puedeEliminar && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bautismos.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {b.fiel.nombre} {b.fiel.apellido}
                    <div className="text-muted-foreground font-mono text-xs">{b.fiel.codigo}</div>
                  </TableCell>
                  <TableCell className="text-xs">{fecha(b.fecha)}</TableCell>
                  <TableCell>{b.ministro ?? "—"}</TableCell>
                  <TableCell className="text-xs">{b.lugar ?? "—"}</TableCell>
                  <TableCell>
                    <EstadoBadge valor={b.tipo} mapa={TIPO_BAUTISMO} />
                  </TableCell>
                  {puedeEliminar && (
                    <TableCell className="text-right">
                      <ActionButton
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Eliminar"
                        confirm="¿Eliminar este registro de bautismo?"
                        successMessage="Registro eliminado"
                        action={eliminarBautismo.bind(null, b.id)}
                      >
                        <Trash2 className="text-red-600" />
                      </ActionButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
