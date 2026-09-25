import { CalendarRange, Plus, Repeat, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/workspace/action-button";
import { FormDialog } from "@/components/workspace/form-dialog";
import { OpcionSelect } from "@/components/workspace/opcion-select";
import { Field, PageHeader, Panel } from "@/components/workspace/ui-kit";
import { fecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { R, tieneRol } from "@/lib/roles";
import { requirePage } from "@/lib/server/session";
import { cn } from "@/lib/utils";
import { domingoDe, hoyISO, lunesDe, sumarSemanas } from "@/server/turnos";
import { asignarTurno, generarRotacion, quitarTurno } from "./actions";

const SEMANAS_ATRAS = 4;
const SEMANAS_ADELANTE = 12;

export default async function CronogramaPage() {
  const user = await requirePage(R.ASISTENCIA_IGLESIA);
  const edita = tieneRol(user.rol, R.ADMIN);
  const hoy = hoyISO();
  const actual = lunesDe(hoy);
  const desde = sumarSemanas(actual, -SEMANAS_ATRAS);
  const hasta = sumarSemanas(actual, SEMANAS_ADELANTE);

  const [turnos, grupos, misGrupos] = await Promise.all([
    prisma.turnoAsistencia.findMany({
      where: { semana: { gte: desde, lte: hasta } },
      include: { grupo: { include: { lider: { select: { nombre: true, apellido: true } } } } },
      orderBy: [{ semana: "asc" }, { grupo: { nombre: "asc" } }],
    }),
    prisma.grupo.findMany({ where: { estado: "ACTIVO" }, orderBy: { nombre: "asc" }, include: { lider: true } }),
    // Grupos propios para resaltarlos
    prisma.grupo.findMany({
      where: { OR: [{ liderId: user.fielId }, { miembros: { some: { id: user.fielId } } }] },
      select: { id: true },
    }),
  ]);
  const mios = new Set(misGrupos.map((g) => g.id));
  const opcionesGrupos = grupos.map((g) => ({ value: g.id, label: g.lider ? `${g.nombre} · ${g.lider.nombre} ${g.lider.apellido}` : g.nombre }));
  const semanas = Array.from({ length: SEMANAS_ATRAS + SEMANAS_ADELANTE + 1 }, (_, i) => sumarSemanas(desde, i));

  return (
    <>
      <PageHeader
        title="Cronograma de asistencia"
        description="Qué grupo registra la asistencia de los servicios cada semana (lunes a domingo)"
        actions={
          edita && (
            <>
              <FormDialog
                title="Rotación automática"
                description="Reparte las semanas entre los grupos activos en orden. No cambia las semanas que ya tienen turno."
                action={generarRotacion}
                successMessage="Rotación generada"
                submitLabel="Generar"
                trigger={
                  <Button variant="outline">
                    <Repeat /> Rotación automática
                  </Button>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Desde la semana del">
                    <Input name="desde" type="date" defaultValue={hoy} required />
                  </Field>
                  <Field label="Número de semanas">
                    <Input name="semanas" type="number" min={1} max={52} defaultValue={8} required />
                  </Field>
                </div>
                <p className="text-muted-foreground text-xs">Grupos en la rotación: {grupos.map((g) => g.nombre).join(", ") || "ninguno"}</p>
              </FormDialog>
              <FormDialog
                title="Asignar turno"
                action={asignarTurno}
                successMessage="Turno asignado"
                trigger={
                  <Button>
                    <Plus /> Asignar turno
                  </Button>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Semana (cualquier día de ella)">
                    <Input name="semana" type="date" defaultValue={hoy} required />
                  </Field>
                  <Field label="Grupo">
                    <OpcionSelect name="grupoId" opciones={opcionesGrupos} required />
                  </Field>
                </div>
                <Field label="Notas (opcional)">
                  <Input name="notas" placeholder="Ej: incluye vigilia del viernes" />
                </Field>
              </FormDialog>
            </>
          )
        }
      />

      {grupos.length === 0 && edita && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Primero crea los grupos con su líder en <strong>Grupos y líderes</strong>.
        </p>
      )}

      <Panel>
        <ol className="divide-y">
          {semanas.map((lunes) => {
            const t = turnos.filter((x) => x.semana.getTime() === lunes.getTime());
            const esActual = lunes.getTime() === actual.getTime();
            const pasada = lunes < actual;
            const meToca = t.some((x) => mios.has(x.grupoId));
            return (
              <li
                key={lunes.toISOString()}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-2 py-3",
                  esActual && "rounded-lg bg-violet-50",
                  pasada && "opacity-60",
                )}
              >
                <div className="w-44 shrink-0">
                  <p className="text-sm font-medium">
                    {fecha(lunes)} – {fecha(domingoDe(lunes))}
                  </p>
                  <div className="flex gap-1">
                    {esActual && <Badge variant="violet">Esta semana</Badge>}
                    {meToca && <Badge variant="success">Te toca</Badge>}
                  </div>
                </div>
                <div className="flex flex-1 flex-wrap gap-2">
                  {t.length === 0 && <span className="text-muted-foreground text-sm">Sin grupo asignado</span>}
                  {t.map((x) => (
                    <span
                      key={x.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                        mios.has(x.grupoId) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "bg-background",
                      )}
                      title={x.notas ?? undefined}
                    >
                      <CalendarRange className="size-3.5" />
                      <strong>{x.grupo.nombre}</strong>
                      {x.grupo.lider && (
                        <span className="text-muted-foreground">
                          · {x.grupo.lider.nombre} {x.grupo.lider.apellido}
                        </span>
                      )}
                      {x.notas && <span className="text-muted-foreground text-xs">({x.notas})</span>}
                      {edita && (
                        <ActionButton
                          size="icon-sm"
                          variant="ghost"
                          className="-mr-2 size-6"
                          aria-label="Quitar turno"
                          confirm={`¿Quitar el turno de ${x.grupo.nombre}?`}
                          successMessage="Turno quitado"
                          action={quitarTurno.bind(null, x.id)}
                        >
                          <X className="size-3.5" />
                        </ActionButton>
                      )}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>
    </>
  );
}
