import { CalendarCheck, Plus, Star, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { EmptyState, EstadoBadge, Field, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fechaHora, isoDate, opciones, TIPO_SERVICIO } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesFieles } from "@/server/opciones";
import { eliminarAsistencia, registrarAsistencia } from "./actions";
import { RegistroMasivo } from "./registro-masivo";

export default async function AsistenciaPage() {
  await requirePage(R.PASTORAL);
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const hace30 = new Date(Date.now() - 30 * 86_400_000);

  const [registros, hoy, ultimos30, domingos, fieles] = await Promise.all([
    prisma.asistenciaCongregacional.findMany({
      orderBy: { fecha: "desc" },
      take: 100,
      include: { fiel: { select: { nombre: true, apellido: true, codigo: true } } },
    }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: inicioHoy } } }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: hace30 } } }),
    prisma.asistenciaCongregacional.count({ where: { servicio: "DOMINGO", fecha: { gte: hace30 } } }),
    opcionesFieles(),
  ]);
  const servicios = opciones(TIPO_SERVICIO);

  return (
    <>
      <PageHeader
        title="Asistencia de la iglesia"
        description="Servicios dominicales, miércoles, GV y especiales"
        actions={
          <FormDialog
            title="Registrar asistencia"
            action={registrarAsistencia}
            successMessage="Asistencia registrada"
            trigger={
              <Button variant="outline">
                <Plus /> Registro individual
              </Button>
            }
          >
            <Field label="Fiel">
              <OpcionSelect name="fielId" opciones={fieles} placeholder="— Invitado (sin registro) —" />
            </Field>
            <Field label="Nombre del invitado (si no es fiel)">
              <Input name="nombreInvitado" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Servicio">
                <NativeSelect name="servicio" defaultValue="DOMINGO">
                  {servicios.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Fecha">
                <Input name="fecha" type="date" defaultValue={isoDate(new Date())} />
              </Field>
            </div>
          </FormDialog>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={CalendarCheck} label="Registros hoy" value={hoy} color="blue" />
        <KpiCard icon={Users} label="Últimos 30 días" value={ultimos30} color="violet" />
        <KpiCard icon={Star} label="Domingos (30 días)" value={domingos} color="amber" />
        <KpiCard icon={UserPlus} label="Fieles activos" value={fieles.length} color="green" />
      </div>

      <Panel title="Registro por servicio">
        <RegistroMasivo fieles={fieles} servicios={servicios} hoy={isoDate(new Date())} />
      </Panel>

      <Panel title="Últimos registros">
        {registros.length === 0 ? (
          <EmptyState icon={CalendarCheck}>Sin registros de asistencia.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Asistente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground text-xs">{fechaHora(r.fecha)}</TableCell>
                  <TableCell className="font-medium">
                    {r.fiel ? `${r.fiel.nombre} ${r.fiel.apellido}` : (r.nombreInvitado ?? "Invitado")}
                    {!r.fiel && <span className="text-muted-foreground ml-2 text-xs">(invitado)</span>}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge valor={r.servicio} mapa={TIPO_SERVICIO} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionButton
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Eliminar"
                      confirm="¿Eliminar este registro?"
                      successMessage="Registro eliminado"
                      action={eliminarAsistencia.bind(null, r.id)}
                    >
                      <Trash2 className="text-red-600" />
                    </ActionButton>
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
