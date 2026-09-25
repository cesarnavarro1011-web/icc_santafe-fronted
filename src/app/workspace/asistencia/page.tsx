import Link from "next/link";
import { CalendarCheck, CalendarRange, Lock, Plus, Star, Trash2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { EmptyState, EstadoBadge, Field, KpiCard, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha, fechaHora, opciones, TIPO_SERVICIO } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { opcionesFieles } from "@/server/opciones";
import { hoyISO, lunesDe, permisoRegistro, turnosDeSemana } from "@/server/turnos";
import { eliminarAsistencia, registrarAsistencia } from "./actions";
import { RegistroMasivo } from "./registro-masivo";

export default async function AsistenciaPage() {
  const user = await requirePage(R.ASISTENCIA_IGLESIA);
  const hoy = hoyISO();
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const hace30 = new Date(Date.now() - 30 * 86_400_000);
  const hace56 = new Date(Date.now() - 56 * 86_400_000);

  const [permiso, turnos, registros, hoyCount, ultimos30, domingos, fieles, resumenBase] = await Promise.all([
    permisoRegistro(user, hoy),
    turnosDeSemana(lunesDe(hoy)),
    prisma.asistenciaCongregacional.findMany({
      orderBy: { fecha: "desc" },
      take: 100,
      include: { fiel: { select: { nombre: true, apellido: true } } },
    }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: inicioHoy } } }),
    prisma.asistenciaCongregacional.count({ where: { fecha: { gte: hace30 } } }),
    prisma.asistenciaCongregacional.count({ where: { servicio: "DOMINGO", fecha: { gte: hace30 } } }),
    opcionesFieles({ conCodigo: false }),
    prisma.asistenciaCongregacional.findMany({
      where: { fecha: { gte: hace56 } },
      select: { fecha: true, servicio: true, fielId: true, registradoPorId: true },
    }),
  ]);
  const servicios = opciones(TIPO_SERVICIO);

  // Nombres de quienes registraron (auditoría)
  const registradores = await prisma.fiel.findMany({
    where: { id: { in: [...new Set([...registros, ...resumenBase].map((r) => r.registradoPorId).filter((x): x is string => !!x))] } },
    select: { id: true, nombre: true, apellido: true },
  });
  const nombreDe = (id: string | null) => {
    const f = registradores.find((r) => r.id === id);
    return f ? `${f.nombre} ${f.apellido}` : "—";
  };

  // Resumen por día y servicio (últimas 8 semanas)
  const resumen = new Map<string, { dia: string; servicio: (typeof resumenBase)[number]["servicio"]; fieles: number; invitados: number; por: Set<string> }>();
  for (const r of resumenBase) {
    const dia = r.fecha.toISOString().slice(0, 10);
    const k = `${dia}|${r.servicio}`;
    const fila = resumen.get(k) ?? { dia, servicio: r.servicio, fieles: 0, invitados: 0, por: new Set<string>() };
    if (r.fielId) fila.fieles++;
    else fila.invitados++;
    if (r.registradoPorId) fila.por.add(nombreDe(r.registradoPorId));
    resumen.set(k, fila);
  }
  const filasResumen = [...resumen.values()].sort((a, b) => b.dia.localeCompare(a.dia));

  const rango = permiso.puede && !permiso.libre ? { min: permiso.desde, max: permiso.hasta } : {};
  const puedeBorrar = (registradoPorId: string | null) =>
    user.rol === "SUPERADMIN" || (permiso.puede && registradoPorId === user.fielId);

  return (
    <>
      <PageHeader
        title="Asistencia de la iglesia"
        description={permiso.puede ? "Registra la asistencia de los servicios de esta semana" : "Consulta de asistencia a los servicios"}
        actions={
          permiso.puede && (
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
                  <Input name="fecha" type="date" defaultValue={hoy} {...rango} />
                </Field>
              </div>
            </FormDialog>
          )
        }
      />

      {/* Turno de la semana */}
      <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4 shadow-sm">
        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
          <CalendarRange className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase">Turno de esta semana</p>
          {turnos.length ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {turnos.map((t) => (
                <Badge key={t.id} variant="violet">
                  {t.grupo.nombre}
                  {t.grupo.lider && ` · ${t.grupo.lider.nombre} ${t.grupo.lider.apellido}`}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm">Ningún grupo tiene turno asignado esta semana.</p>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/workspace/cronograma">Ver cronograma</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={CalendarCheck} label="Registros hoy" value={hoyCount} color="blue" />
        <KpiCard icon={Users} label="Últimos 30 días" value={ultimos30} color="violet" />
        <KpiCard icon={Star} label="Domingos (30 días)" value={domingos} color="amber" />
        <KpiCard icon={UserPlus} label="Fieles activos" value={fieles.length} color="green" />
      </div>

      {permiso.puede ? (
        <Panel title={permiso.libre ? "Registro por servicio" : `Registro por servicio · turno de ${permiso.grupos.join(", ")}`}>
          <RegistroMasivo fieles={fieles} servicios={servicios} hoy={hoy} min={rango.min} max={rango.max} />
        </Panel>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
          <Lock className="size-4 shrink-0" /> {permiso.motivo}
        </div>
      )}

      <Panel title="Resumen por servicio (últimas 8 semanas)">
        {filasResumen.length === 0 ? (
          <EmptyState icon={CalendarCheck}>Sin registros en las últimas semanas.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead className="text-right">Fieles</TableHead>
                <TableHead className="text-right">Invitados</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Registrado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasResumen.map((f) => (
                <TableRow key={`${f.dia}-${f.servicio}`}>
                  <TableCell className="text-xs">{fecha(f.dia)}</TableCell>
                  <TableCell>
                    <EstadoBadge valor={f.servicio} mapa={TIPO_SERVICIO} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{f.fieles}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.invitados}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{f.fieles + f.invitados}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{[...f.por].join(", ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
                <TableHead>Registrado por</TableHead>
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
                  <TableCell className="text-muted-foreground text-xs">{nombreDe(r.registradoPorId)}</TableCell>
                  <TableCell className="text-right">
                    {puedeBorrar(r.registradoPorId) && (
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
